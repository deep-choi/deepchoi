interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../../_utils/auth';
import { ensureAdminDataSchema } from '../../../_utils/schema';

const getCommentIdParam = (value: string | string[] | undefined): string => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (!rawValue) return '';

    try {
        return decodeURIComponent(rawValue);
    } catch {
        return rawValue;
    }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);

        const id = getCommentIdParam(context.params.id);
        const payload = await context.request.json() as any;
        const status = String(payload.status || '').trim();

        if (status !== 'visible' && status !== 'hidden') {
            return Response.json({ error: 'Invalid comment status' }, { status: 400 });
        }

        const result = await context.env.DB.prepare(`
            UPDATE Comment
            SET status = ?
            WHERE id = ?
        `).bind(status, id).run();

        if (result.meta.changes === 0) {
            return Response.json({ error: 'Comment not found' }, { status: 404 });
        }

        return Response.json({ ok: true, status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update comment status';
        return Response.json({ error: message }, { status: 500 });
    }
};
