const CANONICAL_HOST = 'deepchoi.com';
const LEGACY_HOST = 'www.deepchoi.com';

export const onRequest: PagesFunction = async (context) => {
    const url = new URL(context.request.url);

    if (url.hostname === LEGACY_HOST) {
        url.protocol = 'https:';
        url.hostname = CANONICAL_HOST;
        return Response.redirect(url.toString(), 301);
    }

    return context.next();
};
