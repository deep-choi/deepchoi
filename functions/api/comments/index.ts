
interface Env {
    DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { projectId, content, author, date } = await context.request.json() as any;
        const id = Date.now().toString(); // Simple ID generation

        await context.env.DB.prepare(
            "INSERT INTO Comment (id, projectId, content, author, date) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, projectId, content, JSON.stringify(author), date).run();

        const newComment = { id, projectId, content, author, date };
        return Response.json(newComment, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
