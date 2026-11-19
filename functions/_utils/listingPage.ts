import { ensureAdminDataSchema } from './schema';
import {
    applyHeadSeo,
    buildEntryPath,
    DEFAULT_IMAGE,
    escapeHtml,
    jsonForScript,
    pickRenderDescription,
    SITE_NAME,
    SITE_ORIGIN
} from './seo';

interface Env {
    DB: D1Database;
}

export interface ListingPage {
    path: '/work' | '/blog' | '/news';
    kind: 'work' | 'blog' | 'news';
    title: string;
    heading: string;
    description: string;
}

const buildFallback = (page: ListingPage, posts: any[]): string => {
    const items = posts.map((post) => {
        const href = buildEntryPath(post);
        const title = escapeHtml(post.title || '제목 없는 글');
        const description = escapeHtml(pickRenderDescription(post, page.description));
        const date = escapeHtml(String(post.date || '').slice(0, 10));
        return `<li style="margin:0 0 28px"><article><h2 style="margin:0 0 8px;font-size:24px;line-height:1.35"><a href="${href}" style="color:inherit">${title}</a></h2><p style="margin:0 0 8px;color:#555">${description}</p>${date ? `<time datetime="${date}" style="color:#666;font-size:14px">${date}</time>` : ''}</article></li>`;
    }).join('');

    return `<main data-server-rendered-content="true" style="max-width:1000px;margin:0 auto;padding:120px 24px 64px;color:#111;font-family:system-ui,sans-serif;line-height:1.65">
  <header><h1 style="margin:0 0 12px;font-size:clamp(30px,5vw,48px);line-height:1.2">${escapeHtml(page.heading)}</h1><p style="margin:0 0 40px;color:#555;font-size:18px">${escapeHtml(page.description)}</p></header>
  <section aria-label="${escapeHtml(page.heading)} 목록"><ol style="padding-left:24px">${items}</ol></section>
</main>`;
};

/** SQL condition: the post's blog category is listed on /news. */
const NEWS_POST_SQL = `EXISTS (
    SELECT 1 FROM Category c
    WHERE c.type = 'blog' AND c.section = 'news'
        AND ((p.type = 'blog' AND c.name = p.category) OR (p.secondaryType = 'blog' AND c.name = p.secondaryCategory))
)`;

const ORDER_BY_PIN_AND_DATE = `ORDER BY CASE WHEN p.pinOrder IS NULL THEN 1 ELSE 0 END, p.pinOrder ASC, p.date DESC`;

const queryListingPosts = async (db: D1Database, kind: ListingPage['kind']): Promise<any[]> => {
    if (kind === 'work') {
        const { results } = await db.prepare(`
            SELECT p.id, p.slug, p.title, p.subtitle, p.description, p.seoDescription, p.date
            FROM Project p
            WHERE (COALESCE(NULLIF(p.type, ''), 'work') = 'work' OR p.secondaryType = 'work')
                AND COALESCE(p.noIndex, 0) = 0 AND COALESCE(p.isPrivate, 0) = 0
            ${ORDER_BY_PIN_AND_DATE}
        `).all();
        return results as any[];
    }

    const { results } = await db.prepare(`
        SELECT p.id, p.slug, p.title, p.subtitle, p.description, p.seoDescription, p.date
        FROM Project p
        WHERE (p.type = 'blog' OR p.secondaryType = 'blog')
            AND COALESCE(p.noIndex, 0) = 0 AND COALESCE(p.isPrivate, 0) = 0
            AND ${kind === 'news' ? '' : 'NOT '}${NEWS_POST_SQL}
        ${ORDER_BY_PIN_AND_DATE}
    `).all();
    return results as any[];
};

/** Server-renders the list as SEO fallback content behind the client SPA. */
export const renderListingPage = async (context: EventContext<Env, any, any>, page: ListingPage): Promise<Response> => {
    try {
        await ensureAdminDataSchema(context.env.DB);
        const posts = await queryListingPosts(context.env.DB, page.kind);

        const response = await context.next();
        if (!response.headers.get('Content-Type')?.includes('text/html')) return response;

        const url = `${SITE_ORIGIN}${page.path}`;
        const structuredData = {
            '@context': 'https://schema.org',
            '@type': page.kind === 'blog' ? 'Blog' : 'CollectionPage',
            name: page.heading,
            description: page.description,
            url,
            isPartOf: {
                '@type': 'WebSite',
                name: SITE_NAME,
                url: `${SITE_ORIGIN}/`
            },
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: posts.slice(0, 50).map((post, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `${SITE_ORIGIN}${buildEntryPath(post)}`,
                    name: post.title || SITE_NAME
                }))
            }
        };

        return applyHeadSeo(response, {
            title: page.title,
            description: page.description,
            robots: 'index, follow',
            canonical: url,
            ogType: 'website',
            ogUrl: url,
            ogTitle: page.title,
            ogDescription: page.description,
            ogImage: DEFAULT_IMAGE,
            twitterTitle: page.title,
            twitterDescription: page.description,
            twitterImage: DEFAULT_IMAGE,
            headAppendHtml: `<script id="listing-server-structured-data" type="application/ld+json">${jsonForScript(structuredData)}</script>`,
            rootHtml: buildFallback(page, posts)
        });
    } catch {
        return context.next();
    }
};
