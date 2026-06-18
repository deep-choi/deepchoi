
interface Env {
    DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const id = context.params.id;
    try {
        await context.env.DB.prepare("DELETE FROM Comment WHERE id = ?").bind(id).run();
        return Response.json({ message: "Deleted" });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
