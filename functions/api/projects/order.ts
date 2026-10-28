interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema } from '../../_utils/schema';

/**
 * Replaces the admin-chosen top order: the given ids take positions 0..n-1,
 * every other entry goes back to date order.
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);
        const payload = await context.request.json() as { ids?: unknown };
        if (!Array.isArray(payload.ids)) {
            return Response.json({ error: 'ids must be an array' }, { status: 400 });
        }
        const ids = Array.from(new Set(payload.ids.map(id => String(id || '').trim()).filter(Boolean)));

        await context.env.DB.batch([
            context.env.DB.prepare('UPDATE Project SET pinOrder = NULL WHERE pinOrder IS NOT NULL'),
            ...ids.map((id, index) =>
                context.env.DB.prepare('UPDATE Project SET pinOrder = ? WHERE id = ?').bind(index, id)
            )
        ]);

        return Response.json({ ok: true, ids });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save order';
        return Response.json({ error: message }, { status: 500 });
    }
};
