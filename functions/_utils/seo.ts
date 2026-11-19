export const SITE_NAME = 'Deepchoi';
export const SITE_ORIGIN = 'https://deepchoi.com';
export const DEFAULT_TITLE = 'Deepchoi | Portfolio';
export const DEFAULT_DESCRIPTION = 'UI/UX 디자인, 프론트엔드 구현, 바이브코딩 프로젝트를 정리한 Choi의 포트폴리오입니다.';
export const DEFAULT_POST_DESCRIPTION = 'UI/UX 디자인과 프론트엔드 구현 과정을 정리한 Deepchoi 포트폴리오 글입니다.';
export const DEFAULT_IMAGE = `${SITE_ORIGIN}/social/portfolio-og.png`;

const GENERIC_SUMMARIES = new Set([
    '포트폴리오',
    'portfolio',
    'blog',
    '블로그',
    'work',
    '바이브코딩',
    '바이브 코딩',
    'ui ux',
    'ui / ux',
    'contact page content',
    'about page content',
]);

export const escapeHtml = (value?: string): string =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export const decodeHtmlEntities = (value?: string): string =>
    String(value || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#(\d+);/g, (_, code) => {
            const num = Number(code);
            return Number.isFinite(num) && num > 0 ? String.fromCodePoint(num) : '';
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
            const num = parseInt(hex, 16);
            return Number.isFinite(num) && num > 0 ? String.fromCodePoint(num) : '';
        });

export const stripHtml = (value?: string): string =>
    decodeHtmlEntities(
        String(value || '')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
    )
        .replace(/\s+/g, ' ')
        .trim();

export const truncate = (value: string, maxLength: number): string =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

export const jsonForScript = (value: unknown): string =>
    JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');

export const isValidPublicImage = (value?: string | null): boolean => {
    const trimmed = String(value || '').trim();
    return Boolean(trimmed && !trimmed.startsWith('data:'));
};

export const absoluteUrl = (value?: string): string => {
    if (!isValidPublicImage(value)) return DEFAULT_IMAGE;
    const trimmed = String(value).trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `${SITE_ORIGIN}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};

export const buildEntryPath = (project: { id?: string; slug?: string | null }): string =>
    `/post/${encodeURIComponent(String(project.slug || project.id || ''))}`;

export const isWeakSummary = (value?: string | null): boolean => {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized.length < 15 || GENERIC_SUMMARIES.has(normalized);
};

export const pickRenderImage = (project: { seoImage?: string | null; imageUrl?: string | null }): string => {
    if (isValidPublicImage(project.seoImage)) return absoluteUrl(project.seoImage || undefined);
    if (isValidPublicImage(project.imageUrl)) return absoluteUrl(project.imageUrl || undefined);
    return DEFAULT_IMAGE;
};

export const pickRenderDescription = (
    project: { seoDescription?: string | null; subtitle?: string | null; description?: string | null; content?: string | null },
    fallback = DEFAULT_POST_DESCRIPTION
): string => {
    const seoDesc = String(project.seoDescription || '').trim();
    const subtitle = String(project.subtitle || '').trim();
    const description = String(project.description || '').trim();
    const bodyText = stripHtml(project.content || '');

    const candidate =
        (!isWeakSummary(seoDesc) ? seoDesc : '')
        || (!isWeakSummary(description) ? description : '')
        || (!isWeakSummary(subtitle) ? subtitle : '')
        || bodyText
        || seoDesc
        || description
        || subtitle
        || fallback;

    return truncate(candidate, 160);
};

const slugify = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

const unique = (values: string[]): string[] =>
    Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

const buildAutoSeoTitle = (title: string): string =>
    truncate(title ? `${title} | ${SITE_NAME}` : SITE_NAME, 70);

const buildAutoSeoDescription = (subtitle: string, description: string, contentText: string): string => {
    const candidate =
        (!isWeakSummary(description) ? description : '')
        || (!isWeakSummary(subtitle) ? subtitle : '')
        || contentText
        || description
        || subtitle
        || DEFAULT_POST_DESCRIPTION;
    return truncate(candidate, 160);
};

const resolveSyncedSeoImage = (project: any, existingProject?: any): string => {
    const nextImage = String(project.imageUrl ?? existingProject?.imageUrl ?? '').trim();
    const incomingSeoImage = String(project.seoImage ?? '').trim();
    const prevSeoImage = String(existingProject?.seoImage ?? '').trim();
    const prevImage = String(existingProject?.imageUrl ?? '').trim();

    if (isValidPublicImage(incomingSeoImage)) {
        if (!existingProject) return incomingSeoImage;
        if (incomingSeoImage !== prevSeoImage) return incomingSeoImage;
        if (prevSeoImage !== prevImage && nextImage === prevImage) return incomingSeoImage;
        return nextImage || incomingSeoImage;
    }

    return nextImage || incomingSeoImage;
};

export const buildAutomaticSeo = (project: any, existingProject?: any) => {
    const title = String(project.title ?? existingProject?.title ?? '').trim();
    const subtitle = String(project.subtitle ?? existingProject?.subtitle ?? '').trim();
    const description = String(project.description ?? existingProject?.description ?? '').trim();
    const contentText = stripHtml(project.content ?? existingProject?.content ?? '');
    const type = project.type || existingProject?.type || 'work';
    const category = String(project.category ?? existingProject?.category ?? '').trim();
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const tech = Array.isArray(project.tech) ? project.tech : [];
    const date = String(project.date || existingProject?.date || new Date().toISOString().slice(0, 10));
    const existingSlug = String(project.slug || existingProject?.slug || '').trim();
    const slugSeed = title || subtitle || String(project.id || existingProject?.id || 'post');
    const datePrefix = date.slice(0, 10).replace(/-/g, '');
    const idTail = String(project.id || existingProject?.id || Date.now()).slice(-6);
    const generatedSlug = slugify(slugSeed);
    const fallbackSlug = generatedSlug ? `${generatedSlug}-${datePrefix}-${idTail}` : String(project.id || existingProject?.id || '');

    const autoTitle = buildAutoSeoTitle(title);
    const incomingSeoTitle = String(project.seoTitle ?? '').trim();
    const prevTitle = String(existingProject?.title || '').trim();
    const prevAutoTitle = existingProject ? buildAutoSeoTitle(prevTitle) : '';
    const keepCustomTitle = Boolean(
        incomingSeoTitle
        && incomingSeoTitle !== autoTitle
        && (!existingProject || incomingSeoTitle !== prevAutoTitle)
    );

    const autoDescription = buildAutoSeoDescription(subtitle, description, contentText);
    const incomingSeoDescription = String(project.seoDescription ?? '').trim();
    const prevAutoDescription = existingProject
        ? buildAutoSeoDescription(
            String(existingProject.subtitle || '').trim(),
            String(existingProject.description || '').trim(),
            stripHtml(existingProject.content || '')
        )
        : '';
    const keepCustomDescription = Boolean(
        incomingSeoDescription
        && !isWeakSummary(incomingSeoDescription)
        && incomingSeoDescription !== autoDescription
        && (!existingProject || incomingSeoDescription !== prevAutoDescription)
    );

    const keywords = unique([
        ...tags,
        ...tech,
        category,
        type === 'blog' ? '블로그' : '포트폴리오',
        'UI UX',
        '프론트엔드',
        SITE_NAME
    ]).slice(0, 12);

    return {
        ...project,
        slug: existingSlug || fallbackSlug,
        seoTitle: keepCustomTitle ? truncate(incomingSeoTitle, 70) : autoTitle,
        seoDescription: keepCustomDescription ? truncate(incomingSeoDescription, 160) : autoDescription,
        seoImage: resolveSyncedSeoImage(project, existingProject),
        seoKeywords: keywords,
        noIndex: Boolean(project.noIndex ?? existingProject?.noIndex ?? false)
    };
};

const VOID_TAGS = new Set(['br', 'hr', 'img']);
const ALLOWED_CONTAINER_TAGS = new Set([
    'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li',
    'blockquote', 'pre', 'code', 'figure', 'figcaption',
    'strong', 'b', 'em', 'i', 'a'
]);

const extractAttr = (rawAttrs: string, name: string): string => {
    const regex = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + '`' + `]+))`, 'i');
    const match = rawAttrs.match(regex);
    return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
};

const isSafeHref = (href: string): boolean =>
    Boolean(href && (/^(https?:\/\/|mailto:|\/|#)/i.test(href)));

const isSafeImageSrc = (src: string): boolean =>
    Boolean(src && !src.startsWith('data:') && /^(https?:\/\/|\/)/i.test(src));

/**
 * Rebuilds article HTML using a strict whitelist so crawler SSR fallbacks retain
 * semantic headings, lists, links, and image alt attributes without XSS risk.
 */
export const sanitizeHtmlForFallback = (html?: string, maxTextLength = 45000): string => {
    const strippedUnsafe = String(html || '')
        .replace(/<(script|style|iframe|object|embed|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');

    const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
    const output: string[] = [];
    const openStack: string[] = [];
    let lastIndex = 0;
    let textCount = 0;

    const pushText = (rawText: string) => {
        if (!rawText || textCount >= maxTextLength) return;
        const decoded = decodeHtmlEntities(rawText);
        const remaining = maxTextLength - textCount;
        const chunk = decoded.length > remaining ? `${decoded.slice(0, remaining).trimEnd()}…` : decoded;
        textCount += chunk.length;
        output.push(escapeHtml(chunk));
    };

    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(strippedUnsafe)) !== null) {
        if (textCount >= maxTextLength) break;

        pushText(strippedUnsafe.slice(lastIndex, match.index));
        lastIndex = tagPattern.lastIndex;

        const isClosing = match[1] === '/';
        const rawTag = match[2].toLowerCase();
        const rawAttrs = match[3] || '';
        const selfClosing = /\/\s*$/.test(rawAttrs);

        if (VOID_TAGS.has(rawTag)) {
            if (isClosing) continue;
            if (rawTag === 'br' || rawTag === 'hr') {
                output.push(`<${rawTag}>`);
                continue;
            }
            if (rawTag === 'img') {
                const src = extractAttr(rawAttrs, 'src');
                if (!isSafeImageSrc(src)) continue;
                const alt = extractAttr(rawAttrs, 'alt');
                const width = extractAttr(rawAttrs, 'width');
                const height = extractAttr(rawAttrs, 'height');
                const attrs = [`src="${escapeHtml(src)}"`, `alt="${escapeHtml(alt)}"`];
                if (/^\d+$/.test(width)) attrs.push(`width="${width}"`);
                if (/^\d+$/.test(height)) attrs.push(`height="${height}"`);
                attrs.push('loading="lazy"', 'decoding="async"', 'style="max-width:100%;height:auto"');
                output.push(`<img ${attrs.join(' ')}>`);
            }
            continue;
        }

        if (!ALLOWED_CONTAINER_TAGS.has(rawTag)) {
            continue;
        }

        const normalizedTag = rawTag === 'h1' ? 'h2' : rawTag;

        if (isClosing) {
            const stackIndex = openStack.lastIndexOf(normalizedTag);
            if (stackIndex === -1) continue;
            while (openStack.length > stackIndex) {
                const popped = openStack.pop()!;
                output.push(`</${popped}>`);
            }
            continue;
        }

        if (normalizedTag === 'a') {
            const href = extractAttr(rawAttrs, 'href');
            if (!isSafeHref(href)) continue;
            const isExternal = /^https?:\/\//i.test(href) && !href.startsWith(SITE_ORIGIN);
            const relAttr = isExternal ? ' rel="noopener noreferrer"' : '';
            if (!selfClosing) {
                openStack.push('a');
                output.push(`<a href="${escapeHtml(href)}"${relAttr}>`);
            }
            continue;
        }

        if (!selfClosing) {
            openStack.push(normalizedTag);
            output.push(`<${normalizedTag}>`);
        }
    }

    if (textCount < maxTextLength) {
        pushText(strippedUnsafe.slice(lastIndex));
    }

    while (openStack.length > 0) {
        output.push(`</${openStack.pop()!}>`);
    }

    return output.join('').trim();
};

export interface HeadSeoOptions {
    title?: string;
    description?: string;
    robots?: string;
    canonical?: string | null;
    ogType?: string;
    ogUrl?: string | null;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogImageAlt?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    headAppendHtml?: string;
    rootHtml?: string;
    rootAttributes?: Record<string, string>;
    htmlAttributes?: Record<string, string>;
    bodyPrependHtml?: string;
}

/** Rewrites head metadata, removes stale hreflang tags, and optionally injects SSR body content. */
export const applyHeadSeo = (response: Response, options: HeadSeoOptions): Response => {
    const customImage = Boolean(options.ogImage && options.ogImage !== DEFAULT_IMAGE);
    const rewriter = new HTMLRewriter()
        .on('link[rel="alternate"][hreflang]', {
            element(element) {
                element.remove();
            }
        });

    if (options.htmlAttributes) {
        rewriter.on('html', {
            element(element) {
                for (const [key, value] of Object.entries(options.htmlAttributes!)) {
                    element.setAttribute(key, value);
                }
            }
        });
    }

    if (options.title !== undefined) {
        rewriter.on('title', {
            element(element) {
                element.setInnerContent(options.title!);
            }
        });
    }

    if (options.description !== undefined) {
        rewriter.on('meta[name="description"]', {
            element(element) {
                element.setAttribute('content', options.description!);
            }
        });
    }

    if (options.robots !== undefined) {
        rewriter.on('meta[name="robots"]', {
            element(element) {
                element.setAttribute('content', options.robots!);
            }
        });
    }

    if (options.canonical !== undefined) {
        rewriter.on('link[rel="canonical"]', {
            element(element) {
                if (options.canonical === null) {
                    element.remove();
                } else {
                    element.setAttribute('href', options.canonical);
                }
            }
        });
    }

    if (options.ogType !== undefined) {
        rewriter.on('meta[property="og:type"]', {
            element(element) {
                element.setAttribute('content', options.ogType!);
            }
        });
    }

    if (options.ogUrl !== undefined) {
        rewriter.on('meta[property="og:url"]', {
            element(element) {
                if (options.ogUrl === null) {
                    element.remove();
                } else {
                    element.setAttribute('content', options.ogUrl);
                }
            }
        });
    }

    if (options.ogTitle !== undefined) {
        rewriter.on('meta[property="og:title"]', {
            element(element) {
                element.setAttribute('content', options.ogTitle!);
            }
        });
    }

    if (options.ogDescription !== undefined) {
        rewriter.on('meta[property="og:description"]', {
            element(element) {
                element.setAttribute('content', options.ogDescription!);
            }
        });
    }

    if (options.ogImage !== undefined) {
        rewriter.on('meta[property="og:image"]', {
            element(element) {
                element.setAttribute('content', options.ogImage!);
            }
        });
        if (customImage) {
            rewriter
                .on('meta[property="og:image:width"]', { element(element) { element.remove(); } })
                .on('meta[property="og:image:height"]', { element(element) { element.remove(); } });
        }
    }

    if (options.ogImageAlt !== undefined) {
        rewriter.on('meta[property="og:image:alt"]', {
            element(element) {
                element.setAttribute('content', options.ogImageAlt!);
            }
        });
    }

    if (options.twitterTitle !== undefined) {
        rewriter.on('meta[name="twitter:title"]', {
            element(element) {
                element.setAttribute('content', options.twitterTitle!);
            }
        });
    }

    if (options.twitterDescription !== undefined) {
        rewriter.on('meta[name="twitter:description"]', {
            element(element) {
                element.setAttribute('content', options.twitterDescription!);
            }
        });
    }

    if (options.twitterImage !== undefined) {
        rewriter.on('meta[name="twitter:image"]', {
            element(element) {
                element.setAttribute('content', options.twitterImage!);
            }
        });
    }

    if (options.headAppendHtml) {
        rewriter.on('head', {
            element(element) {
                element.append(options.headAppendHtml!, { html: true });
            }
        });
    }

    if (options.rootHtml !== undefined || options.rootAttributes) {
        rewriter.on('div#root', {
            element(element) {
                if (options.rootAttributes) {
                    for (const [key, value] of Object.entries(options.rootAttributes)) {
                        element.setAttribute(key, value);
                    }
                }
                if (options.rootHtml !== undefined) {
                    element.setInnerContent(options.rootHtml, { html: true });
                }
            }
        });
    }

    if (options.bodyPrependHtml) {
        rewriter.on('body', {
            element(element) {
                element.prepend(options.bodyPrependHtml!, { html: true });
            }
        });
    }

    return rewriter.transform(response);
};
