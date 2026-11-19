interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from './_utils/schema';
import {
    absoluteUrl,
    applyHeadSeo,
    buildEntryPath,
    DEFAULT_DESCRIPTION,
    DEFAULT_IMAGE,
    DEFAULT_TITLE,
    escapeHtml,
    isValidPublicImage,
    jsonForScript,
    pickRenderDescription,
    SITE_NAME,
    SITE_ORIGIN
} from './_utils/seo';

const HERO_HEADLINE = '기획부터 개발까지 완성도 높은 웹 경험을 만듭니다.';

const buildHomeFallback = (projects: any[]): string => {
    const items = projects.map((project) => {
        const href = buildEntryPath(project);
        const title = escapeHtml(project.title || SITE_NAME);
        const summary = escapeHtml(pickRenderDescription(project, DEFAULT_DESCRIPTION));
        const date = escapeHtml(String(project.date || '').slice(0, 10));
        const thumb = isValidPublicImage(project.imageUrl)
            ? `<img src="${escapeHtml(absoluteUrl(project.imageUrl))}" alt="${title}" loading="lazy" decoding="async" style="display:block;width:100%;max-width:720px;height:auto;border-radius:12px;margin:0 0 12px">`
            : '';
        return `<li style="margin:0 0 36px"><article>${thumb}<h2 style="margin:0 0 8px;font-size:24px;line-height:1.35"><a href="${href}" style="color:inherit">${title}</a></h2><p style="margin:0 0 8px;color:#555">${summary}</p>${date ? `<time datetime="${date}" style="color:#666;font-size:14px">${date}</time>` : ''}</article></li>`;
    }).join('');

    return `<main data-server-rendered-content="true" style="max-width:1000px;margin:0 auto;padding:120px 24px 64px;color:#111;font-family:system-ui,sans-serif;line-height:1.65">
  <header style="margin:0 0 48px">
    <h1 style="margin:0 0 16px;font-size:clamp(30px,5vw,52px);line-height:1.2">${HERO_HEADLINE}</h1>
    <p style="margin:0 0 20px;color:#555;font-size:18px">${escapeHtml(DEFAULT_DESCRIPTION)}</p>
    <nav aria-label="주요 메뉴" style="display:flex;gap:16px;flex-wrap:wrap">
      <a href="/work">Work</a>
      <a href="/blog">Blog</a>
      <a href="/news">News</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <section aria-label="주요 프로젝트"><ol style="padding-left:24px">${items}</ol></section>
</main>`;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    if (url.hostname === 'www.deepchoi.com') {
        url.protocol = 'https:';
        url.hostname = 'deepchoi.com';
        return Response.redirect(url.toString(), 301);
    }

    try {
        await ensureAdminDataSchema(context.env.DB);
        const { results } = await context.env.DB.prepare(`
            SELECT id, slug, title, subtitle, description, seoDescription, imageUrl, date
            FROM Project
            WHERE (COALESCE(NULLIF(type, ''), 'work') = 'work' OR secondaryType = 'work')
                AND COALESCE(noIndex, 0) = 0 AND COALESCE(isPrivate, 0) = 0
            ORDER BY CASE WHEN pinOrder IS NULL THEN 1 ELSE 0 END, pinOrder ASC, date DESC
        `).all();

        const response = await context.next();
        if (!response.headers.get('Content-Type')?.includes('text/html')) return response;

        const websiteStructuredData = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: `${SITE_ORIGIN}/`,
            description: DEFAULT_DESCRIPTION,
            inLanguage: 'ko-KR'
        };

        return applyHeadSeo(response, {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESCRIPTION,
            robots: 'index, follow',
            canonical: `${SITE_ORIGIN}/`,
            ogType: 'website',
            ogUrl: `${SITE_ORIGIN}/`,
            ogTitle: DEFAULT_TITLE,
            ogDescription: DEFAULT_DESCRIPTION,
            ogImage: DEFAULT_IMAGE,
            twitterTitle: DEFAULT_TITLE,
            twitterDescription: DEFAULT_DESCRIPTION,
            twitterImage: DEFAULT_IMAGE,
            headAppendHtml: `<script id="website-server-structured-data" type="application/ld+json">${jsonForScript(websiteStructuredData)}</script>`,
            rootHtml: buildHomeFallback(results as any[])
        });
    } catch {
        return context.next();
    }
};
