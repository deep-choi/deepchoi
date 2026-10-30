"""Prepare a content-only D1 migration and update local fallback content.

Input: .generated/headings-before.json from wrangler d1 execute (SELECT Project).
The original snapshot stays in .generated; no database writes happen here.
"""
import json
from pathlib import Path
from html.parser import HTMLParser

class HeadingTokens(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=False)
        self.offsets = [0]
        for line in html.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.edits = []
        self.protected = []
        self.feed(html)

    def location(self):
        line, col = self.getpos()
        return self.offsets[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if tag in ('pre', 'code', 'script', 'style'):
            self.protected.append(tag)
        if tag in ('h1', 'h2') and not self.protected:
            pos = self.location() + 1
            self.edits.append((pos, pos + 2))

    def handle_endtag(self, tag):
        if tag in ('h1', 'h2') and not self.protected:
            pos = self.location() + 2
            self.edits.append((pos, pos + 2))
        if tag in self.protected:
            self.protected = self.protected[:self.protected.index(tag)]

def normalize(html):
    edits = HeadingTokens(html).edits
    result = html
    for start, end in reversed(edits):
        result = result[:start] + 'h3' + result[end:]
    # Only tag-name character substitutions are allowed.
    assert len(result) == len(html)
    return result, len(edits) // 2

def quote(value):
    return "'" + value.replace("'", "''") + "'"

root = Path(__file__).resolve().parents[1]
generated = root / '.generated'
rows = json.loads((generated/'headings-before.json').read_text(encoding='utf-8-sig'))[0]['results']
statements, expected, heading_count = [], [], 0
for row in rows:
    old = row.get('content') or ''
    new, count = normalize(old)
    if new == old:
        continue
    # Keep statements below D1's SQL size limit without dropping the exact-content guard.
    calculated = old.replace('<h1', '<h3').replace('</h1>', '</h3>').replace('<h2', '<h3').replace('</h2>', '</h3>')
    assert calculated == new, 'SQL replacement must match the parsed heading-only changes'
    expression = "replace(replace(replace(replace(content, '<h1', '<h3'), '</h1>', '</h3>'), '<h2', '<h3'), '</h2>', '</h3>')"
    statements.append('UPDATE Project SET content=' + expression + ' WHERE id=' + quote(row['id']) + ' AND content=' + quote(old) + ';')
    expected.append(dict(id=row['id'], content=new, headings=count))
    heading_count += count
(generated/'headings-update.sql').write_bytes('\n'.join(statements).encode('utf-8'))
(generated/'headings-expected.json').write_text(json.dumps(expected, ensure_ascii=False), encoding='utf-8')

# Replace only the JSON content string literals, keeping all other source bytes intact.
import re
pattern = re.compile(r'("content"\s*:\s*)("(?:\\.|[^"\\])*")')
fallbacks = []
for relative in ['data/projects.ts', 'local_projects.json', 'server/data/db.json']:
    path = root / relative
    source = path.read_bytes().decode('utf-8')
    changed = [0]
    def replace(match):
        old = json.loads(match.group(2))
        new, count = normalize(old)
        if new == old:
            return match.group(0)
        changed[0] += count
        return match.group(1) + json.dumps(new, ensure_ascii=False)
    result = pattern.sub(replace, source)
    if result != source:
        path.write_bytes(result.encode('utf-8'))
    fallbacks.append({'path':relative,'headings':changed[0]})
print(json.dumps({'records':len(expected),'headings':heading_count,'fallbacks':fallbacks}, ensure_ascii=False))
