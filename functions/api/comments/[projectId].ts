
interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from '../../_utils/schema';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const projectId = context.params.projectId;
    try {
        await ensureAdminDataSchema(context.env.DB);

        const { results } = await context.env.DB.prepare(`
            SELECT *
            FROM Comment
            WHERE projectId = ? AND COALESCE(status, 'visible') = 'visible'
            ORDER BY date DESC
        `).bind(projectId).all();
        const comments = results.map(c => ({
            ...c,
            author: JSON.parse(c.author as string)
        }));
        return Response.json(comments);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
