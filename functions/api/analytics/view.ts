interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { getSessionUser, isAllowedAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema } from '../../_utils/schema';

const encoder = new TextEncoder();

const hashValue = async (value: string): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
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
        const projectId = payload.projectId ? String(payload.projectId).trim().slice(0, 120) : null;
        if (!path || !path.startsWith('/')) {
            return Response.json({ error: 'Invalid path' }, { status: 400 });
        }

        const now = new Date();
        const ip = context.request.headers.get('CF-Connecting-IP')
            || context.request.headers.get('x-forwarded-for')
            || 'unknown';
        const userAgent = context.request.headers.get('user-agent') || '';
        const secret = context.env.ADMIN_SESSION_SECRET || 'local-analytics-secret';
        const ipHash = await hashValue(`${secret}:${ip}:${userAgent}`);

        await context.env.DB.prepare(`
            INSERT INTO PageView (id, projectId, path, referrer, ipHash, day, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            projectId,
            path,
            String(payload.referrer || '').slice(0, 500),
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
