import { ensureAdminDataSchema } from './schema';

interface Env {
    DB: D1Database;
}

const SITE_ORIGIN = 'https://deepchoi.com';

export interface ListingPage {
    path: '/blog' | '/news';
    title: string;
    heading: string;
    description: string;
    news: boolean;
}

const escapeHtml = (value?: string): string =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const truncate = (value: string, maxLength: number): string =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

const buildFallback = (page: ListingPage, posts: any[]): string => {
    const items = posts.map((post) => {
        const slug = encodeURIComponent(post.slug || post.id);
        const title = escapeHtml(post.title || '제목 없는 글');
        const description = escapeHtml(truncate(post.seoDescription || post.description || post.subtitle || '', 220));
        const date = escapeHtml(String(post.date || '').slice(0, 10));
        return `<li style="margin:0 0 28px"><article><h2 style="margin:0 0 8px;font-size:24px;line-height:1.35"><a href="/post/${slug}" style="color:inherit">${title}</a></h2><p style="margin:0 0 8px;color:#555">${description}</p>${date ? `<time datetime="${date}" style="color:#666;font-size:14px">${date}</time>` : ''}</article></li>`;
    }).join('');

    return `<main data-server-rendered-content="true" style="max-width:1000px;margin:0 auto;padding:120px 24px 64px;color:#111;font-family:system-ui,sans-serif;line-height:1.65">
  <header><h1 style="margin:0 0 12px;font-size:clamp(30px,5vw,48px);line-height:1.2">${escapeHtml(page.heading)}</h1><p style="margin:0 0 40px;color:#555;font-size:18px">${escapeHtml(page.description)}</p></header>
  <section aria-label="최근 게시글"><ol style="padding-left:24px">${items}</ol></section>
</main>`;
};

/** SQL condition: the post's blog category is listed on /news. */
const NEWS_POST_SQL = `EXISTS (
    SELECT 1 FROM Category c
    WHERE c.type = 'blog' AND c.section = 'news'
        AND ((p.type = 'blog' AND c.name = p.category) OR (p.secondaryType = 'blog' AND c.name = p.secondaryCategory))
)`;

/** Server-renders the list as SEO fallback content behind the app loader. */
export const renderListingPage = async (context: EventContext<Env, any, any>, page: ListingPage): Promise<Response> => {
    try {
        await ensureAdminDataSchema(context.env.DB);
        const { results } = await context.env.DB.prepare(`
            SELECT p.id, p.slug, p.title, p.subtitle, p.description, p.seoDescription, p.date
            FROM Project p
            WHERE (p.type = 'blog' OR p.secondaryType = 'blog')
                AND COALESCE(p.noIndex, 0) = 0 AND COALESCE(p.isPrivate, 0) = 0
                AND ${page.news ? '' : 'NOT '}${NEWS_POST_SQL}
            ORDER BY p.date DESC
        `).all();

        const response = await context.next();
        if (!response.headers.get('Content-Type')?.includes('text/html')) return response;

        const url = `${SITE_ORIGIN}${page.path}`;
        const structuredData = {
            '@context': 'https://schema.org',
            '@type': page.news ? 'CollectionPage' : 'Blog',
            name: page.heading,
            description: page.description,
            url
        };

        return new HTMLRewriter()
            .on('title', { element(element) { element.setInnerContent(page.title); } })
            .on('meta[name="description"]', { element(element) { element.setAttribute('content', page.description); } })
            .on('link[rel="canonical"]', { element(element) { element.setAttribute('href', url); } })
            .on('meta[property="og:url"]', { element(element) { element.setAttribute('content', url); } })
            .on('meta[property="og:title"]', { element(element) { element.setAttribute('content', page.title); } })
            .on('meta[property="og:description"]', { element(element) { element.setAttribute('content', page.description); } })
            .on('head', {
                element(element) {
                    element.append(`<script id="listing-server-structured-data" type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`, { html: true });
                }
            })
            .on('div#root', { element(element) { element.setInnerContent(buildFallback(page, results as any[]), { html: true }); } })
            .transform(response);
    } catch {
        return context.next();
    }
};
