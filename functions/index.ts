import {
    applyHeadSeo,
    DEFAULT_DESCRIPTION,
    DEFAULT_IMAGE,
    DEFAULT_TITLE,
    jsonForScript,
    SITE_NAME,
    SITE_ORIGIN
} from './_utils/seo';

export const onRequestGet: PagesFunction = async (context) => {
    const url = new URL(context.request.url);
    if (url.hostname === 'www.deepchoi.com') {
        url.protocol = 'https:';
        url.hostname = 'deepchoi.com';
        return Response.redirect(url.toString(), 301);
    }

    try {
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
            headAppendHtml: `<script id="website-server-structured-data" type="application/ld+json">${jsonForScript(websiteStructuredData)}</script>`
        });
    } catch {
        return context.next();
    }
};
