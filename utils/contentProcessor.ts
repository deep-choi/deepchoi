const DANGEROUS_TAGS = ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'];

const BLOCK_TAGS = new Set([
    'ADDRESS',
    'ARTICLE',
    'ASIDE',
    'BLOCKQUOTE',
    'DIV',
    'FIGCAPTION',
    'FIGURE',
    'FOOTER',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'HEADER',
    'HR',
    'LI',
    'MAIN',
    'NAV',
    'OL',
    'P',
    'PRE',
    'SECTION',
    'TABLE',
    'UL',
]);

const TEXT_BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'FIGCAPTION']);
const MEDIA_TAGS = new Set(['IMG', 'VIDEO']);
const ALLOWED_CLASSES = new Set([
    'image-grid',
    'image-grid-2',
    'image-grid-3',
    'image-grid-4',
    'image-carousel',
    'image-carousel-track',
    'image-carousel-slide',
    'image-carousel-nav',
    'image-carousel-prev',
    'image-carousel-next',
    'full-width'
]);

const TEXT_STYLE_PROPS = new Set([
    'background-color',
    'color',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'letter-spacing',
    'line-height',
    'text-align',
    'text-decoration',
]);

const MEDIA_STYLE_PROPS = new Set([
    'border',
    'border-radius',
    'height',
    'margin',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'margin-top',
    'max-height',
    'max-width',
    'object-fit',
    'width',
]);

const isElementNode = (node: Node): node is HTMLElement => node.nodeType === Node.ELEMENT_NODE;

const isMeaningfulNode = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
        return Boolean(node.textContent?.trim());
    }

    if (!isElementNode(node)) {
        return false;
    }

    if (node.tagName === 'BR') {
        return false;
    }

    if (node.tagName === 'HR' || MEDIA_TAGS.has(node.tagName)) {
        return true;
    }

    return Array.from(node.childNodes).some(isMeaningfulNode);
};

const hasMeaningfulContent = (el: HTMLElement): boolean => {
    return Array.from(el.childNodes).some(isMeaningfulNode);
};

const copyAttributes = (source: HTMLElement, target: HTMLElement) => {
    Array.from(source.attributes).forEach(attr => {
        target.setAttribute(attr.name, attr.value);
    });
};

const getAllowedStyleProps = (el: HTMLElement): Set<string> => {
    const allowed = new Set(TEXT_STYLE_PROPS);

    if (TEXT_BLOCK_TAGS.has(el.tagName)) {
        allowed.add('margin-bottom');
        allowed.add('margin-top');
    }

    if (MEDIA_TAGS.has(el.tagName) || el.tagName === 'FIGURE') {
        MEDIA_STYLE_PROPS.forEach(prop => allowed.add(prop));
    }

    return allowed;
};

const cleanStyleAttribute = (el: HTMLElement) => {
    const rawStyle = el.getAttribute('style');
    if (!rawStyle) return;

    const allowedProps = getAllowedStyleProps(el);
    const cleaned: string[] = [];

    rawStyle.split(';').forEach(declaration => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex === -1) return;

        const prop = declaration.slice(0, separatorIndex).trim().toLowerCase();
        const value = declaration.slice(separatorIndex + 1).trim();

        if (!prop || !value || prop.startsWith('--') || !allowedProps.has(prop)) {
            return;
        }

        if (/expression\s*\(/i.test(value) || /url\s*\(\s*javascript:/i.test(value)) {
            return;
        }

        cleaned.push(`${prop}: ${value}`);
    });

    if (cleaned.length > 0) {
        el.setAttribute('style', cleaned.join('; '));
    } else {
        el.removeAttribute('style');
    }
};

const removeUnsafeElementsAndAttributes = (root: HTMLElement) => {
    DANGEROUS_TAGS.forEach(tagName => {
        const elements = Array.from(root.getElementsByTagName(tagName));
        elements.forEach(el => {
            el.parentNode?.removeChild(el);
        });
    });

    Array.from(root.querySelectorAll('*')).forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = attr.value.trim();

            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
                return;
            }

            if ((name === 'href' || name === 'src') && /^javascript:/i.test(value)) {
                el.removeAttribute(attr.name);
            }
        });
    });
};

const removeEditorArtifacts = (root: HTMLElement) => {
    Array.from(root.querySelectorAll('*')).forEach(el => {
        const element = el as HTMLElement;
        const className = element.getAttribute('class');

        if (className) {
            const safeClasses = className.split(/\s+/).filter(name => ALLOWED_CLASSES.has(name));
            if (safeClasses.length > 0) {
                element.setAttribute('class', safeClasses.join(' '));
            } else {
                element.removeAttribute('class');
            }
        }

        element.removeAttribute('contenteditable');
        element.removeAttribute('spellcheck');
        cleanStyleAttribute(element);
    });
};

const normalizeLegacyFontTags = (root: HTMLElement) => {
    const doc = root.ownerDocument;
    Array.from(root.querySelectorAll('font')).forEach(font => {
        const span = doc.createElement('span');
        const color = font.getAttribute('color');
        const size = font.getAttribute('size');
        const existingStyle = font.getAttribute('style');
        const styleParts: string[] = [];

        if (existingStyle) {
            styleParts.push(existingStyle);
        }

        if (color) {
            styleParts.push(`color: ${color}`);
        }

        if (size) {
            styleParts.push(`font-size: ${size}`);
        }

        copyAttributes(font as HTMLElement, span);
        span.removeAttribute('color');
        span.removeAttribute('size');

        if (styleParts.length > 0) {
            span.setAttribute('style', styleParts.join('; '));
        }

        while (font.firstChild) {
            span.appendChild(font.firstChild);
        }

        font.parentNode?.replaceChild(span, font);
        cleanStyleAttribute(span);
    });
};

const normalizeHeadingsWithBlockChildren = (root: HTMLElement) => {
    const headings = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[];

    headings.forEach(heading => {
        const hasBlockChild = Array.from(heading.childNodes).some(node => isElementNode(node) && BLOCK_TAGS.has(node.tagName));
        if (!hasBlockChild) return;

        const doc = heading.ownerDocument;
        const fragment = doc.createDocumentFragment();
        let inlineBucket = heading.cloneNode(false) as HTMLElement;

        const flushInlineBucket = () => {
            if (hasMeaningfulContent(inlineBucket)) {
                fragment.appendChild(inlineBucket);
            }
            inlineBucket = heading.cloneNode(false) as HTMLElement;
        };

        Array.from(heading.childNodes).forEach(node => {
            if (isElementNode(node) && BLOCK_TAGS.has(node.tagName)) {
                flushInlineBucket();
                fragment.appendChild(node);
                return;
            }

            inlineBucket.appendChild(node);
        });

        flushInlineBucket();
        heading.parentNode?.replaceChild(fragment, heading);
    });
};

const normalizeDivBlocks = (root: HTMLElement) => {
    const divs = Array.from(root.querySelectorAll('div')) as HTMLElement[];

    divs.forEach(div => {
        if (div.classList.contains('image-grid') || div.querySelector('img,video')) {
            return;
        }

        const doc = div.ownerDocument;
        const hasBlockChild = Array.from(div.childNodes).some(node => isElementNode(node) && BLOCK_TAGS.has(node.tagName));

        if (hasBlockChild) {
            const fragment = doc.createDocumentFragment();
            while (div.firstChild) {
                fragment.appendChild(div.firstChild);
            }
            div.parentNode?.replaceChild(fragment, div);
            return;
        }

        const paragraph = doc.createElement('p');
        copyAttributes(div, paragraph);
        while (div.firstChild) {
            paragraph.appendChild(div.firstChild);
        }
        div.parentNode?.replaceChild(paragraph, div);
    });
};

const unwrapEmptySpans = (root: HTMLElement) => {
    const spans = Array.from(root.querySelectorAll('span')) as HTMLElement[];

    spans.forEach(span => {
        if (span.attributes.length > 0) {
            return;
        }

        if (!span.firstChild) {
            span.parentNode?.removeChild(span);
            return;
        }

        const fragment = span.ownerDocument.createDocumentFragment();
        while (span.firstChild) {
            fragment.appendChild(span.firstChild);
        }
        span.parentNode?.replaceChild(fragment, span);
    });
};

const removeBreaksAfterRules = (root: HTMLElement) => {
    Array.from(root.querySelectorAll('hr')).forEach(rule => {
        let sibling = rule.nextSibling;

        while (sibling && sibling.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim()) {
            const nodeToRemove = sibling;
            sibling = sibling.nextSibling;
            nodeToRemove.parentNode?.removeChild(nodeToRemove);
        }

        if (sibling?.nodeName === 'BR') {
            sibling.parentNode?.removeChild(sibling);
        }
    });
};

const normalizeEmptyBlocks = (root: HTMLElement) => {
    const blocks = Array.from(root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,blockquote,li')) as HTMLElement[];

    blocks.forEach(block => {
        if (hasMeaningfulContent(block)) {
            return;
        }

        if (block.tagName === 'P') {
            block.innerHTML = '<br>';
        } else {
            block.parentNode?.removeChild(block);
        }
    });
};

const wrapLooseBodyNodes = (root: HTMLElement) => {
    const doc = root.ownerDocument;
    const childNodes = Array.from(root.childNodes);

    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            const p = doc.createElement('p');
            p.textContent = node.textContent;
            node.parentNode?.replaceChild(p, node);
            return;
        }

        if (node.nodeName === 'BR') {
            const p = doc.createElement('p');
            p.innerHTML = '<br>';
            node.parentNode?.replaceChild(p, node);
        }
    });
};

// Sanitize HTML content while preserving editor-applied inline styles.
export const sanitizeContent = (html: string): string => {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    removeUnsafeElementsAndAttributes(doc.body);

    // Ensure all direct text nodes in body are wrapped in p tags
    const childNodes = Array.from(doc.body.childNodes);
    childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
            const p = doc.createElement('p');
            p.textContent = node.textContent;
            node.parentNode?.replaceChild(p, node);
        }
    });

    return doc.body.innerHTML;
};

// Normalize contentEditable output before persisting it.
export const normalizeEditorHtml = (html: string): string => {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizeContent(html), 'text/html');

    normalizeLegacyFontTags(doc.body);
    removeEditorArtifacts(doc.body);
    normalizeHeadingsWithBlockChildren(doc.body);
    normalizeDivBlocks(doc.body);
    unwrapEmptySpans(doc.body);
    removeBreaksAfterRules(doc.body);
    normalizeEmptyBlocks(doc.body);
    wrapLooseBodyNodes(doc.body);

    return doc.body.innerHTML;
};

// Linkify URLs in HTML - creates clickable links without using span wrapper
export const linkifyHtml = (html: string): string => {
    if (!html) return '';

    // First sanitize the content
    const sanitized = sanitizeContent(html);

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');

    const walker = document.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        null
    );

    const nodesToReplace: { node: Node, content: string }[] = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.parentElement && ['A', 'SCRIPT', 'STYLE', 'BUTTON', 'TEXTAREA'].includes(node.parentElement.tagName)) {
            continue;
        }

        if (node.textContent && /(https?:\/\/[^\s]+)/.test(node.textContent)) {
            nodesToReplace.push({ node, content: node.textContent });
        }
    }

    nodesToReplace.forEach(({ node, content }) => {
        const fragment = doc.createDocumentFragment();
        const parts = content.split(/(https?:\/\/[^\s]+)/g);

        parts.forEach(part => {
            if (/(https?:\/\/[^\s]+)/.test(part)) {
                const a = doc.createElement('a');
                a.href = part;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = part;
                a.className = 'text-[#007aff] hover:underline break-all';
                fragment.appendChild(a);
            } else if (part) {
                fragment.appendChild(doc.createTextNode(part));
            }
        });

        node.parentNode?.replaceChild(fragment, node);
    });

    return doc.body.innerHTML;
};
