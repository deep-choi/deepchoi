import { applyHeadSeo, SITE_NAME } from './_utils/seo';

const CANONICAL_HOST = 'deepchoi.com';
const LEGACY_HOST = 'www.deepchoi.com';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const NOINDEX_TITLES: Record<string, string> = {
    '/login': `로그인 | ${SITE_NAME}`,
    '/signup': `회원가입 | ${SITE_NAME}`,
    '/admin': `관리자 | ${SITE_NAME}`,
};

const isNoIndexRoute = (pathname: string): boolean =>
    pathname === '/login'
    || pathname === '/signup'
    || pathname === '/admin'
    || pathname.startsWith('/admin/');

const isKnownPublicHtmlRoute = (pathname: string): boolean =>
    pathname === '/'
    || pathname === '/work'
    || pathname === '/blog'
    || pathname === '/news'
    || pathname === '/contact'
    || (pathname.startsWith('/post/') && pathname.length > '/post/'.length);

const noIndexTitleFor = (pathname: string): string => {
    if (pathname.startsWith('/admin')) return NOINDEX_TITLES['/admin'];
    return NOINDEX_TITLES[pathname] || SITE_NAME;
};

export const onRequest: PagesFunction<{ READ_ONLY_PREVIEW?: string }> = async (context) => {
    const url = new URL(context.request.url);

    // `npm run dev:live` points local dev at the production database; never let it write there.
    if (context.env.READ_ONLY_PREVIEW && url.pathname.startsWith('/api/') && !READ_METHODS.has(context.request.method)) {
        return Response.json({ error: '실데이터 미리보기는 읽기 전용입니다. 저장·수정·삭제는 실제 사이트에서 해 주세요.' }, { status: 403 });
    }

    if (url.hostname === LEGACY_HOST) {
        url.protocol = 'https:';
        url.hostname = CANONICAL_HOST;
        return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/images/')) {
        return context.next();
    }

    if (READ_METHODS.has(context.request.method) && url.pathname.length > 1 && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.slice(0, -1);
        return Response.redirect(url.toString(), 301);
    }

    // Legacy /about route redirects to the merged home page, matching App.tsx.
    if (url.pathname === '/about') {
        url.pathname = '/';
        return Response.redirect(url.toString(), 301);
    }

    const response = await context.next();
    if (!READ_METHODS.has(context.request.method) || !response.headers.get('Content-Type')?.includes('text/html')) {
        return response;
    }

    if (isNoIndexRoute(url.pathname)) {
        const transformed = applyHeadSeo(response, {
            title: noIndexTitleFor(url.pathname),
            robots: 'noindex, nofollow',
            canonical: null,
            ogUrl: null
        });
        const headers = new Headers(transformed.headers);
        headers.set('X-Robots-Tag', 'noindex, nofollow');
        return new Response(transformed.body, { status: transformed.status, headers });
    }

    if (!isKnownPublicHtmlRoute(url.pathname)) {
        const transformed = applyHeadSeo(response, {
            title: `페이지를 찾을 수 없습니다 | ${SITE_NAME}`,
            description: '요청하신 페이지를 찾을 수 없습니다.',
            robots: 'noindex, nofollow',
            canonical: null,
            ogUrl: null
        });
        const headers = new Headers(transformed.headers);
        headers.set('X-Robots-Tag', 'noindex, nofollow');
        return new Response(transformed.body, { status: 404, headers });
    }

    return response;
};
