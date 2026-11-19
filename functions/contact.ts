interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from './_utils/schema';
import {
    applyHeadSeo,
    DEFAULT_IMAGE,
    escapeHtml,
    jsonForScript,
    pickRenderDescription,
    sanitizeHtmlForFallback,
    SITE_NAME,
    SITE_ORIGIN
} from './_utils/seo';

const FALLBACK_DESCRIPTION = 'Deepchoi에게 프로젝트 문의 및 협업을 제안할 수 있는 연락처 페이지입니다.';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);
        const contact: any = await context.env.DB.prepare(
            "SELECT id, title, subtitle, description, seoTitle, seoDescription, content FROM Project WHERE id = 'contact' LIMIT 1"
        ).first();

        const response = await context.next();
        if (!response.headers.get('Content-Type')?.includes('text/html')) return response;

        const heading = String(contact?.title || 'Contact').trim();
        const title = `${heading} | ${SITE_NAME}`;
        const description = pickRenderDescription(contact || {}, FALLBACK_DESCRIPTION);
        const url = `${SITE_ORIGIN}/contact`;
        const sanitizedBody = sanitizeHtmlForFallback(contact?.content);

        const structuredData = {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: heading,
            description,
            url,
            isPartOf: {
                '@type': 'WebSite',
                name: SITE_NAME,
                url: `${SITE_ORIGIN}/`
            }
        };

        const subtitleMarkup = contact?.subtitle
            ? `<p style="margin:0 0 24px;color:#555;font-size:18px">${escapeHtml(contact.subtitle)}</p>`
            : '';

        const fallbackHtml = `<main data-server-rendered-content="true" style="max-width:760px;margin:0 auto;padding:120px 24px 64px;color:#111;font-family:system-ui,sans-serif;line-height:1.75">
  <header>
    <h1 style="margin:0 0 12px;font-size:clamp(30px,5vw,48px);line-height:1.2">${escapeHtml(heading)}</h1>
    ${subtitleMarkup}
  </header>
  <div>${sanitizedBody || `<p>${escapeHtml(description)}</p>`}</div>
  <footer style="margin-top:32px;display:flex;gap:16px">
    <a href="mailto:cryingonion77@gmail.com">Email</a>
    <a href="https://github.com/deep-choi" rel="noopener noreferrer">GitHub</a>
  </footer>
</main>`;

        return applyHeadSeo(response, {
            title,
            description,
            robots: 'index, follow',
            canonical: url,
            ogType: 'website',
            ogUrl: url,
            ogTitle: title,
            ogDescription: description,
            ogImage: DEFAULT_IMAGE,
            twitterTitle: title,
            twitterDescription: description,
            twitterImage: DEFAULT_IMAGE,
            headAppendHtml: `<script id="contact-server-structured-data" type="application/ld+json">${jsonForScript(structuredData)}</script>`,
            rootHtml: fallbackHtml
        });
    } catch {
        return context.next();
    }
};
