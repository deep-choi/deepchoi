interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema, normalizeSecondaryPlacement } from '../_utils/schema';
import {
    absoluteUrl,
    applyHeadSeo,
    escapeHtml,
    isValidPublicImage,
    jsonForScript,
    pickRenderDescription,
    pickRenderImage,
    sanitizeHtmlForFallback,
    SITE_NAME,
    SITE_ORIGIN,
    truncate
} from '../_utils/seo';

const parseJsonArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (!value) return [];
    try {
        const parsed = JSON.parse(String(value));
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
};

const buildArticleFallback = (project: any, description: string, publishedAt?: string): string => {
    const safeTitle = escapeHtml(project.title || SITE_NAME);
    const safeDescription = escapeHtml(description);
    const safeDate = escapeHtml(publishedAt || '');
    const dateMarkup = publishedAt
        ? `<p style="margin:0 0 28px;color:#666;font-size:14px"><time datetime="${safeDate}">${safeDate}</time></p>`
        : '';
    const coverMarkup = isValidPublicImage(project.imageUrl)
        ? `<figure style="margin:0 0 32px"><img src="${escapeHtml(absoluteUrl(project.imageUrl))}" alt="${safeTitle}" loading="eager" decoding="async" style="max-width:100%;height:auto;border-radius:12px"></figure>`
        : '';
    const sanitizedBody = sanitizeHtmlForFallback(project.content);

    return `<article data-server-rendered-content="true" style="max-width:1000px;margin:0 auto;padding:120px 24px 64px;color:#111;font-family:system-ui,sans-serif;line-height:1.75">
  <header>
    <h1 style="margin:0 0 12px;font-size:clamp(30px,5vw,48px);line-height:1.2">${safeTitle}</h1>
    <p style="margin:0 0 12px;color:#555;font-size:18px">${safeDescription}</p>
    ${dateMarkup}
  </header>
  ${coverMarkup}
  <div>${sanitizedBody || `<p>${safeDescription}</p>`}</div>
</article>`;
};

const POST_INITIAL_LOADER_STYLE = `<style id="post-initial-loader-style">
  html[data-post-loading="true"],
  html[data-post-loading="true"] body {
    overflow: hidden !important;
  }

  #post-initial-loader {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    color: #111111;
    font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    opacity: 1;
    transition: opacity 180ms ease;
  }

  #post-initial-loader[data-ready="true"] {
    opacity: 0;
    pointer-events: none;
  }

  .post-initial-loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .post-initial-loader-spinner {
    width: 32px;
    height: 32px;
    box-sizing: border-box;
    border: 4px solid #dce5ff;
    border-top-color: #4169e1;
    border-radius: 50%;
    animation: post-initial-loader-spin 720ms linear infinite;
  }

  .post-initial-loader-label {
    margin: 0;
    color: #666666;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  @keyframes post-initial-loader-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    #post-initial-loader { transition: none; }
    .post-initial-loader-spinner { animation-duration: 1400ms; }
  }
</style>`;

const POST_INITIAL_LOADER_MARKUP = `<div id="post-initial-loader" role="status" aria-live="polite" aria-label="게시글을 불러오는 중입니다">
  <div class="post-initial-loader-content">
    <div class="post-initial-loader-spinner" aria-hidden="true"></div>
    <p class="post-initial-loader-label">게시글을 불러오는 중입니다.</p>
  </div>
</div>
<noscript><style>
  #post-initial-loader { display: none !important; }
  html[data-post-loading="true"], html[data-post-loading="true"] body { overflow: auto !important; }
</style></noscript>`;

const decodePathPart = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const renderNotFoundPost = async (context: EventContext<Env, any, any>): Promise<Response> => {
    const shell = await context.next();
    if (!shell.headers.get('Content-Type')?.includes('text/html')) {
        return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
    }

    const transformed = applyHeadSeo(shell, {
        title: `페이지를 찾을 수 없습니다 | ${SITE_NAME}`,
        description: '요청하신 게시글을 찾을 수 없습니다.',
        robots: 'noindex, nofollow',
        canonical: null,
        ogUrl: null,
        ogTitle: `페이지를 찾을 수 없습니다 | ${SITE_NAME}`,
        ogDescription: '요청하신 게시글을 찾을 수 없습니다.',
        twitterTitle: `페이지를 찾을 수 없습니다 | ${SITE_NAME}`,
        twitterDescription: '요청하신 게시글을 찾을 수 없습니다.'
    });
    const headers = new Headers(transformed.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(transformed.body, { status: 404, headers });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const rawId = Array.isArray(context.params.id) ? context.params.id.join('/') : context.params.id;
    const id = decodePathPart(String(rawId || ''));

    if (!id) return renderNotFoundPost(context);

    try {
        await ensureAdminDataSchema(context.env.DB);
        const project: any = await context.env.DB.prepare(
            'SELECT * FROM Project WHERE id = ? OR slug = ? LIMIT 1'
        ).bind(id, id).first();

        if (!project) return renderNotFoundPost(context);

        if (project.isPrivate) {
            // Serve the bare app shell: no title, description or image of a private entry
            // may reach crawlers or link previews. The app itself asks the API, which checks the session.
            const shell = await context.next();
            const isHtml = shell.headers.get('Content-Type')?.includes('text/html');
            const sanitizedShell = isHtml
                ? applyHeadSeo(shell, {
                    robots: 'noindex, nofollow',
                    canonical: null,
                    ogUrl: null
                })
                : shell;
            const headers = new Headers(sanitizedShell.headers);
            headers.set('X-Robots-Tag', 'noindex, nofollow');
            headers.set('Cache-Control', 'private, no-store');
            return new Response(sanitizedShell.body, { status: sanitizedShell.status, headers });
        }

        const slug = project.slug || project.id;
        const url = `${SITE_ORIGIN}/post/${encodeURIComponent(slug)}`;

        // Legacy ID URLs remain valid entry points, but search engines and
        // visitors should always land on the one canonical slug URL.
        if (id !== slug) {
            return Response.redirect(url, 301);
        }

        const author = JSON.parse(project.author || '{}') as { name?: string; role?: string; avatarUrl?: string };
        const title = truncate(project.seoTitle || `${project.title} | ${SITE_NAME}`, 70);
        const description = pickRenderDescription(project);
        const image = pickRenderImage(project);
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

        const initialProject = {
            ...project,
            ...normalizeSecondaryPlacement(project),
            tech: parseJsonArray(project.tech),
            tags: parseJsonArray(project.tags),
            seoKeywords: parseJsonArray(project.seoKeywords),
            noIndex: Boolean(project.noIndex),
            isPrivate: false,
            pinOrder: project.pinOrder === null || project.pinOrder === undefined ? null : Number(project.pinOrder),
            author
        };

        const robots = project.noIndex ? 'noindex, nofollow' : 'index, follow';
        const articleMeta = [
            publishedAt ? `<meta property="article:published_time" content="${escapeHtml(publishedAt)}">` : '',
            `<script id="project-server-structured-data" type="application/ld+json">${jsonForScript(structuredData)}</script>`,
            `<script id="__INITIAL_PROJECT__" type="application/json">${jsonForScript(initialProject)}</script>`,
            POST_INITIAL_LOADER_STYLE
        ].join('');
        const articleFallback = buildArticleFallback(project, description, publishedAt);

        const transformed = applyHeadSeo(response, {
            htmlAttributes: { 'data-post-loading': 'true' },
            title,
            description,
            robots,
            canonical: url,
            ogType: isBlogPost ? 'article' : 'website',
            ogUrl: url,
            ogTitle: title,
            ogDescription: description,
            ogImage: image,
            ogImageAlt: project.title,
            twitterTitle: title,
            twitterDescription: description,
            twitterImage: image,
            headAppendHtml: articleMeta,
            rootAttributes: { 'aria-busy': 'true' },
            rootHtml: articleFallback,
            bodyPrependHtml: POST_INITIAL_LOADER_MARKUP
        });

        if (project.noIndex) {
            const headers = new Headers(transformed.headers);
            headers.set('X-Robots-Tag', 'noindex, nofollow');
            return new Response(transformed.body, { status: transformed.status, headers });
        }

        return transformed;
    } catch {
        return context.next();
    }
};
