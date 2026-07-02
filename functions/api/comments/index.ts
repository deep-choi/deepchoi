
interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from '../../_utils/schema';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);

        const { projectId, content, author, date } = await context.request.json() as any;
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
