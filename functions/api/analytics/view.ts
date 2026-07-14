interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

type CloudflareLocation = {
    country?: string | null;
    region?: string | null;
};

import { getSessionUser, isAllowedAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema } from '../../_utils/schema';

const encoder = new TextEncoder();

const hashValue = async (value: string): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const trimField = (value: unknown, maxLength = 120): string | null => {
    const normalized = String(value || '').trim().slice(0, maxLength);
    return normalized || null;
};

const parseHost = (value: string, fallbackOrigin: string): string | null => {
    if (!value) return null;
    try {
        return new URL(value, fallbackOrigin).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return null;
    }
};

const classifySource = (referrerHost: string | null, requestHost: string, utmSource: string | null): string => {
    if (utmSource) return 'campaign';
    if (!referrerHost) return 'direct';
    if (referrerHost === requestHost) return 'internal';

    const searchHosts = ['google.', 'naver.', 'daum.', 'bing.', 'yahoo.', 'duckduckgo.'];
    if (searchHosts.some(host => referrerHost.includes(host))) return 'search';

    const socialHosts = [
        'instagram.com',
        'facebook.com',
        'threads.net',
        'twitter.com',
        'x.com',
        'linkedin.com',
        'youtube.com',
        't.co'
    ];
    if (socialHosts.some(host => referrerHost === host || referrerHost.endsWith(`.${host}`))) return 'social';

    return 'external';
};

const detectDeviceType = (userAgent: string): string => {
    const ua = userAgent.toLowerCase();
    if (/bot|crawler|spider|slurp|facebookexternalhit|preview/.test(ua)) return 'bot';
    if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android/.test(ua)) return 'mobile';
    return 'desktop';
};

const detectBrowser = (userAgent: string): string => {
    if (/Edg\//.test(userAgent)) return 'Edge';
    if (/SamsungBrowser\//.test(userAgent)) return 'Samsung Internet';
    if (/Firefox\//.test(userAgent)) return 'Firefox';
    if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return 'Chrome';
    if (/Safari\//.test(userAgent)) return 'Safari';
    return 'Other';
};

const detectOs = (userAgent: string): string => {
    if (/Windows NT/.test(userAgent)) return 'Windows';
    if (/Mac OS X/.test(userAgent) && !/Mobile/.test(userAgent)) return 'macOS';
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
    if (/Android/.test(userAgent)) return 'Android';
    if (/Linux/.test(userAgent)) return 'Linux';
    return 'Other';
};

const resolveProjectId = async (db: D1Database, projectRef: string | null, path: string): Promise<string | null> => {
    const postMatch = path.match(/^\/post\/([^/?#]+)/);
    const postRef = postMatch ? decodeURIComponent(postMatch[1]) : null;
    const lookup = projectRef || postRef;
    if (!lookup) return null;

    const project: any = await db.prepare(`
        SELECT id
        FROM Project
        WHERE id = ? OR slug = ?
        LIMIT 1
    `).bind(lookup, lookup).first();

    return project?.id || null;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);

        const user = await getSessionUser(context.request, context.env).catch(() => null);
        if (user && isAllowedAdmin(user)) {
            return Response.json({ ok: true, tracked: false });
        }

        const payload = await context.request.json().catch(() => ({})) as any;
        const path = String(payload.path || '').trim().slice(0, 500);
        const projectRef = trimField(payload.projectId);
        if (!path || !path.startsWith('/')) {
            return Response.json({ error: 'Invalid path' }, { status: 400 });
        }

        const requestUrl = new URL(context.request.url);
        const viewedUrl = new URL(path, requestUrl.origin);
        const referrer = String(payload.referrer || '').slice(0, 500);
        const referrerHost = parseHost(referrer, requestUrl.origin);
        const utmSource = trimField(viewedUrl.searchParams.get('utm_source'));
        const utmMedium = trimField(viewedUrl.searchParams.get('utm_medium'));
        const utmCampaign = trimField(viewedUrl.searchParams.get('utm_campaign'));
        const source = classifySource(referrerHost, requestUrl.hostname.replace(/^www\./, '').toLowerCase(), utmSource);
        const projectId = await resolveProjectId(context.env.DB, projectRef, viewedUrl.pathname);

        const now = new Date();
        const ip = context.request.headers.get('CF-Connecting-IP')
            || context.request.headers.get('x-forwarded-for')
            || 'unknown';
        const userAgent = context.request.headers.get('user-agent') || '';
        const location = (context.request as Request & { cf?: CloudflareLocation }).cf;
        const country = location?.country || context.request.headers.get('CF-IPCountry') || null;
        const region = location?.region || null;
        const secret = context.env.ADMIN_SESSION_SECRET || 'local-analytics-secret';
        const ipHash = await hashValue(`${secret}:${ip}:${userAgent}`);

        await context.env.DB.prepare(`
            INSERT INTO PageView (
                id,
                projectId,
                path,
                referrer,
                referrerHost,
                source,
                deviceType,
                browser,
                os,
                utmSource,
                utmMedium,
                utmCampaign,
                country,
                region,
                ipHash,
                day,
                createdAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            projectId,
            path,
            referrer,
            referrerHost,
            source,
            detectDeviceType(userAgent),
            detectBrowser(userAgent),
            detectOs(userAgent),
            utmSource,
            utmMedium,
            utmCampaign,
            country,
            region,
            ipHash,
            now.toISOString().slice(0, 10),
            now.toISOString()
        ).run();

        return Response.json({ ok: true, tracked: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to track page view';
        return Response.json({ error: message }, { status: 500 });
    }
};
