
interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { isEntryHiddenFrom } from '../../_utils/auth';
import { ensureAdminDataSchema } from '../../_utils/schema';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);

        const { projectId, content, author, date } = await context.request.json() as any;
        if (await isEntryHiddenFrom(context.request, context.env, String(projectId || ''))) {
            return Response.json({ error: 'Not found' }, { status: 404 });
        }
        const id = Date.now().toString(); // Simple ID generation

        await context.env.DB.prepare(
            "INSERT INTO Comment (id, projectId, content, author, date, status) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, projectId, content, JSON.stringify(author), date, 'visible').run();

        const newComment = { id, projectId, content, author, date, status: 'visible' };
        return Response.json(newComment, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
