
interface Env {
    BUCKET: R2Bucket;
}

const LIVE_ORIGIN = 'https://deepchoi.com';

const shouldFetchFromLive = (request: Request) => {
    const { hostname } = new URL(request.url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const key = Array.isArray(context.params.key) ? context.params.key.join('/') : context.params.key;

    if (!key) {
        return new Response('Image key required', { status: 400 });
    }

    const object = await context.env.BUCKET.get(key);

    if (object === null) {
        if (shouldFetchFromLive(context.request)) {
            const liveResponse = await fetch(`${LIVE_ORIGIN}/images/${key}`);

            if (liveResponse.ok && liveResponse.body) {
                const headers = new Headers(liveResponse.headers);
                headers.set('Cache-Control', 'public, max-age=31536000');
                return new Response(liveResponse.body, {
                    status: liveResponse.status,
                    headers,
                });
            }
        }

        return new Response('Image not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    // Cache control for performance
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, {
        headers,
    });
};
