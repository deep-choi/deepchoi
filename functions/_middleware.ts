const CANONICAL_HOST = 'deepchoi.com';
const LEGACY_HOST = 'www.deepchoi.com';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

    return context.next();
};
