const allowedTags = new Set(['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'A', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'IMG']);
const discardTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON']);

// Clipboard HTML is untrusted. Copy only the formatting and links we support.
export const cleanPastedHtml = (html: string): string => {
    const source = new DOMParser().parseFromString(html, 'text/html');
    const output = document.createElement('div');
    const copy = (node: Node, parent: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            parent.appendChild(document.createTextNode(node.textContent || ''));
            return;
        }
        if (!(node instanceof Element) || discardTags.has(node.tagName)) return;
        if (!allowedTags.has(node.tagName)) {
            Array.from(node.childNodes).forEach(child => copy(child, parent));
            return;
        }
        const element = document.createElement(/^H[1-6]$/.test(node.tagName) ? 'h3' : node.tagName.toLowerCase());
        if (node.tagName === 'A') {
            const href = node.getAttribute('href')?.trim() || '';
            if (/^(https?:|mailto:|\/|#)/i.test(href) && !href.startsWith('//')) element.setAttribute('href', href);
        }
        if (node.tagName === 'IMG') {
            const src = node.getAttribute('src')?.trim() || '';
            if (!/^(https?:\/\/|\/[^/]|data:image\/(png|jpeg|gif|webp);base64,)/i.test(src)) return;
            element.setAttribute('src', src);
            element.setAttribute('alt', node.getAttribute('alt') || '');
        }
        const style = (node as HTMLElement).style;
        if (style?.fontWeight && /^(bold|[5-9]00)$/i.test(style.fontWeight)) element.style.fontWeight = style.fontWeight;
        if (style?.fontStyle === 'italic') element.style.fontStyle = 'italic';
        if (style?.textDecorationLine && /^(underline|line-through)(\s+(underline|line-through))?$/.test(style.textDecorationLine)) element.style.textDecorationLine = style.textDecorationLine;
        parent.appendChild(element);
        Array.from(node.childNodes).forEach(child => copy(child, element));
    };
    Array.from(source.body.childNodes).forEach(node => copy(node, output));
    return output.innerHTML;
};

