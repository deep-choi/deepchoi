interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from './_utils/schema';

const SITE_ORIGIN = 'https://deepchoi.com';

const escapeXml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const toDate = (value?: string): string => {
    if (!value) return new Date().toISOString().slice(0, 10);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return value.slice(0, 10);
};

const urlEntry = (path: string, lastmod: string, changefreq: string, priority: string): string => `  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}${path}`)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);

        const { results } = await context.env.DB.prepare(`
            SELECT
                p.id,
                p.slug,
                p.type,
                p.secondaryType,
                p.date,
                EXISTS (
                    SELECT 1 FROM Category c
                    WHERE c.type = 'blog' AND c.section = 'news'
                        AND ((p.type = 'blog' AND c.name = p.category) OR (p.secondaryType = 'blog' AND c.name = p.secondaryCategory))
                ) AS isNews
            FROM Project p
            WHERE (
                p.id = 'contact'
                OR (
                    COALESCE(p.noIndex, 0) = 0
                    AND COALESCE(p.isPrivate, 0) = 0
                    AND COALESCE(NULLIF(p.type, ''), 'work') IN ('work', 'blog')
                )
            )
            ORDER BY p.date DESC
        `).all();

        const rows = results as any[];
        const contactRow = rows.find((row) => row.id === 'contact');
        const posts = rows.filter((row) => row.id !== 'contact' && ['work', 'blog'].includes(row.type || 'work'));
        const latestDateOf = (predicate: (post: any) => boolean, fallback: string) => {
            const match = posts.find(predicate);
            return match?.date ? toDate(match.date) : fallback;
        };

        const today = new Date().toISOString().slice(0, 10);
        const latestOverall = latestDateOf(() => true, today);
        const latestWork = latestDateOf((p) => (p.type || 'work') === 'work' || p.secondaryType === 'work', latestOverall);
        const latestBlog = latestDateOf((p) => (p.type === 'blog' || p.secondaryType === 'blog') && !p.isNews, latestOverall);
        const latestNews = latestDateOf((p) => (p.type === 'blog' || p.secondaryType === 'blog') && Boolean(p.isNews), latestOverall);
        const contactLastmod = contactRow?.date ? toDate(contactRow.date) : '2026-06-18';

        const entries = [
            urlEntry('/', latestOverall, 'weekly', '1.0'),
            urlEntry('/work', latestWork, 'weekly', '0.9'),
            urlEntry('/blog', latestBlog, 'weekly', '0.8'),
            urlEntry('/news', latestNews, 'daily', '0.7'),
            urlEntry('/contact', contactLastmod, 'monthly', '0.7'),
            ...posts.map((project: any) => {
                const path = `/post/${encodeURIComponent(project.slug || project.id)}`;
                const priority = project.type === 'blog' ? '0.7' : '0.8';
                return urlEntry(path, toDate(project.date), 'monthly', priority);
            })
        ];

        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=300'
            }
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate sitemap';
        return Response.json({ error: message }, { status: 500 });
    }
};
