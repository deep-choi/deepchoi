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
        const payload = await context.request.json() as { content?: unknown };
        const content = String(payload.content || '').trim();

        if (!id) {
            return Response.json({ error: 'Comment id is required' }, { status: 400 });
        }

        if (!content) {
            return Response.json({ error: 'Comment content is required' }, { status: 400 });
        }

        if (content.length > 2000) {
            return Response.json({ error: 'Comment content is too long' }, { status: 400 });
        }

        const result = await context.env.DB.prepare(`
            UPDATE Comment
            SET content = ?
            WHERE id = ?
        `).bind(content, id).run();

        if (result.meta.changes === 0) {
            return Response.json({ error: 'Comment not found' }, { status: 404 });
        }

        const updatedComment: any = await context.env.DB.prepare(`
            SELECT id, projectId, content, author, date, COALESCE(status, 'visible') AS status
            FROM Comment
            WHERE id = ?
        `).bind(id).first();

        return Response.json({
            ...updatedComment,
            author: JSON.parse(updatedComment.author || '{}')
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update comment';
        return Response.json({ error: message }, { status: 500 });
    }
};
