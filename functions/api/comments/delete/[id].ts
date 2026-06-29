
interface Env {
    DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const id = context.params.id;
    try {
        const result = await context.env.DB.prepare("DELETE FROM Comment WHERE id = ?").bind(id).run();
        if (result.meta.changes === 0) {
            return Response.json({ error: "Comment not found" }, { status: 404 });
        }
        return Response.json({ message: "Deleted" });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
