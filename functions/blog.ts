interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from './_utils/schema';

const SITE_ORIGIN = 'https://deepchoi.com';
const PAGE_TITLE = 'Deepchoi 블로그 | AI, 개발, UI/UX 기록';
const PAGE_DESCRIPTION = 'AI, Python, 프론트엔드와 UI/UX 구현 과정을 정리하는 Deepchoi 기술 블로그입니다.';

const escapeHtml = (value?: string): string =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const truncate = (value: string, maxLength: number): string =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

const buildBlogFallback = (posts: any[]): string => {
    const items = posts.map((post) => {
        const slug = encodeURIComponent(post.slug || post.id);
        const title = escapeHtml(post.title || '제목 없는 글');
        const description = escapeHtml(truncate(post.seoDescription || post.description || post.subtitle || '', 220));
        const date = escapeHtml(String(post.date || '').slice(0, 10));
        return `<li style="margin:0 0 28px"><article><h2 style="margin:0 0 8px;font-size:24px;line-height:1.35"><a href="/post/${slug}" style="color:inherit">${title}</a></h2><p style="margin:0 0 8px;color:#555">${description}</p>${date ? `<time datetime="${date}" style="color:#666;font-size:14px">${date}</time>` : ''}</article></li>`;
    }).join('');

    return `<main data-server-rendered-content="true" style="max-width:1000px;margin:0 auto;padding:120px 24px 64px;color:#111;font-family:system-ui,sans-serif;line-height:1.65">
  <header><h1 style="margin:0 0 12px;font-size:clamp(30px,5vw,48px);line-height:1.2">Deepchoi 블로그</h1><p style="margin:0 0 40px;color:#555;font-size:18px">${PAGE_DESCRIPTION}</p></header>
  <section aria-label="최근 게시글"><ol style="padding-left:24px">${items}</ol></section>
</main>`;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);
        const { results } = await context.env.DB.prepare(`
            SELECT id, slug, title, subtitle, description, seoDescription, date
            FROM Project
            WHERE type = 'blog' AND COALESCE(noIndex, 0) = 0
            ORDER BY date DESC
        `).all();

        const response = await context.next();
        if (!response.headers.get('Content-Type')?.includes('text/html')) return response;

        const structuredData = {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Deepchoi 블로그',
            description: PAGE_DESCRIPTION,
            url: `${SITE_ORIGIN}/blog`
        };

        return new HTMLRewriter()
            .on('title', { element(element) { element.setInnerContent(PAGE_TITLE); } })
            .on('meta[name="description"]', { element(element) { element.setAttribute('content', PAGE_DESCRIPTION); } })
            .on('link[rel="canonical"]', { element(element) { element.setAttribute('href', `${SITE_ORIGIN}/blog`); } })
            .on('meta[property="og:url"]', { element(element) { element.setAttribute('content', `${SITE_ORIGIN}/blog`); } })
            .on('meta[property="og:title"]', { element(element) { element.setAttribute('content', PAGE_TITLE); } })
            .on('meta[property="og:description"]', { element(element) { element.setAttribute('content', PAGE_DESCRIPTION); } })
            .on('head', {
                element(element) {
                    element.append(`<script id="blog-server-structured-data" type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`, { html: true });
                }
            })
            .on('div#root', { element(element) { element.setInnerContent(buildBlogFallback(results as any[]), { html: true }); } })
            .transform(response);
    } catch {
        return context.next();
    }
};
