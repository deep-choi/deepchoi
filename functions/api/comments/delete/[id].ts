
interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../../_utils/auth';
import { ensureAdminDataSchema } from '../../../_utils/schema';

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    const id = context.params.id;
    try {
        await ensureAdminDataSchema(context.env.DB);

        const result = await context.env.DB.prepare("DELETE FROM Comment WHERE id = ?").bind(id).run();
        if (result.meta.changes === 0) {
            return Response.json({ error: "Comment not found" }, { status: 404 });
        }
        return Response.json({ message: "Deleted" });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
