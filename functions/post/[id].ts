interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from '../_utils/schema';

const SITE_NAME = 'Deepchoi';
const SITE_ORIGIN = 'https://deepchoi.com';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/hero_bg.png`;

const stripHtml = (value?: string): string =>
    String(value || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

const truncate = (value: string, maxLength: number): string =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

const absoluteUrl = (value?: string): string => {
    if (!value || value.startsWith('data:')) return DEFAULT_IMAGE;
    if (/^https?:\/\//i.test(value)) return value;
    return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
};

const jsonForScript = (value: unknown): string =>
    JSON.stringify(value).replace(/</g, '\\u003c');

const escapeHtml = (value?: string): string =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const buildArticleFallback = (project: any, description: string, publishedAt?: string): string => {
    // The React application replaces this immediately for visitors. Keeping the
    // same public text in the initial HTML gives crawlers a complete document
    // without relying on a later JavaScript rendering pass.
    const body = stripHtml(project.content) || description;
    const safeBody = escapeHtml(truncate(body, 30000));
    const safeTitle = escapeHtml(project.title || SITE_NAME);
    const safeDescription = escapeHtml(description);
    const safeDate = escapeHtml(publishedAt || '');
    const dateMarkup = publishedAt
        ? `<p style="margin:0 0 28px;color:#666;font-size:14px"><time datetime="${safeDate}">${safeDate}</time></p>`
        : '';

    return `<article data-server-rendered-content="true" style="max-width:1000px;margin:0 auto;padding:120px 24px 64px;color:#111;font-family:system-ui,sans-serif;line-height:1.75">
  <header>
    <h1 style="margin:0 0 12px;font-size:clamp(30px,5vw,48px);line-height:1.2">${safeTitle}</h1>
    <p style="margin:0 0 12px;color:#555;font-size:18px">${safeDescription}</p>
    ${dateMarkup}
  </header>
  <div><p style="white-space:pre-wrap">${safeBody}</p></div>
</article>`;
};

const decodePathPart = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const rawId = Array.isArray(context.params.id) ? context.params.id.join('/') : context.params.id;
    const id = decodePathPart(String(rawId || ''));

    if (!id) return context.next();

    try {
        await ensureAdminDataSchema(context.env.DB);
        const project: any = await context.env.DB.prepare(
            'SELECT * FROM Project WHERE id = ? OR slug = ? LIMIT 1'
        ).bind(id, id).first();

        if (!project) return context.next();

        const author = JSON.parse(project.author || '{}') as { name?: string };
        const title = truncate(project.seoTitle || `${project.title} | ${SITE_NAME}`, 70);
        const description = truncate(
            project.seoDescription || project.description || project.subtitle || stripHtml(project.content) || 'Deepchoi 포트폴리오 글입니다.',
            160
        );
        const slug = project.slug || project.id;
        const url = `${SITE_ORIGIN}/post/${encodeURIComponent(slug)}`;
        const image = absoluteUrl(project.seoImage || project.imageUrl);
        const publishedAt = String(project.date || '').slice(0, 10) || undefined;
        const isBlogPost = project.type === 'blog';
        const structuredData = {
            '@context': 'https://schema.org',
            '@type': isBlogPost ? 'BlogPosting' : 'CreativeWork',
            headline: project.title,
            description,
            image,
            url,
            datePublished: publishedAt,
            dateModified: publishedAt,
            author: {
                '@type': 'Person',
                name: author.name || 'Choi'
            },
            publisher: {
                '@type': 'Organization',
                name: SITE_NAME,
                url: SITE_ORIGIN
            },
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': url
            }
        };
        const response = await context.next();
        if (!response.headers.get('Content-Type')?.includes('text/html')) return response;

        const robots = project.noIndex ? 'noindex, nofollow' : 'index, follow';
        const articleMeta = [
            `<meta property="article:published_time" content="${publishedAt || ''}">`,
            `<script id="project-server-structured-data" type="application/ld+json">${jsonForScript(structuredData)}</script>`
        ].join('');
        const articleFallback = buildArticleFallback(project, description, publishedAt);

        return new HTMLRewriter()
            .on('title', {
                element(element) {
                    element.setInnerContent(title);
                }
            })
            .on('meta[name="description"]', {
                element(element) {
                    element.setAttribute('content', description);
                }
            })
            .on('meta[name="robots"]', {
                element(element) {
                    element.setAttribute('content', robots);
                }
            })
            .on('link[rel="canonical"]', {
                element(element) {
                    element.setAttribute('href', url);
                }
            })
            .on('meta[property="og:type"]', {
                element(element) {
                    element.setAttribute('content', isBlogPost ? 'article' : 'website');
                }
            })
            .on('meta[property="og:url"]', {
                element(element) {
                    element.setAttribute('content', url);
                }
            })
            .on('meta[property="og:title"]', {
                element(element) {
                    element.setAttribute('content', title);
                }
            })
            .on('meta[property="og:description"]', {
                element(element) {
                    element.setAttribute('content', description);
                }
            })
            .on('meta[property="og:image"]', {
                element(element) {
                    element.setAttribute('content', image);
                }
            })
            .on('meta[property="og:image:alt"]', {
                element(element) {
                    element.setAttribute('content', project.title);
                }
            })
            .on('meta[name="twitter:card"]', {
                element(element) {
                    element.setAttribute('content', 'summary_large_image');
                }
            })
            .on('meta[name="twitter:title"]', {
                element(element) {
                    element.setAttribute('content', title);
                }
            })
            .on('meta[name="twitter:description"]', {
                element(element) {
                    element.setAttribute('content', description);
                }
            })
            .on('meta[name="twitter:image"]', {
                element(element) {
                    element.setAttribute('content', image);
                }
            })
            .on('head', {
                element(element) {
                    element.append(articleMeta, { html: true });
                }
            })
            .on('div#root', {
                element(element) {
                    element.setInnerContent(articleFallback, { html: true });
                }
            })
            .transform(response);
    } catch {
        return context.next();
    }
};
