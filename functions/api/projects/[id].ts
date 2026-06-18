
interface Env {
    DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const id = context.params.id;
    try {
        const project: any = await context.env.DB.prepare("SELECT * FROM Project WHERE id = ?").bind(id).first();
        if (!project) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }
        return Response.json({
            ...project,
            tech: JSON.parse(project.tech as string),
            tags: JSON.parse(project.tags as string),
            author: JSON.parse(project.author as string)
        });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const id = context.params.id;
    try {
        const project: any = await context.request.json();
        console.log('[API] Updating project:', id);
        console.log('[API] Content length:', project.content?.length);

        const info = await context.env.DB.prepare(
            `UPDATE Project SET title=?, subtitle=?, description=?, tech=?, tags=?, imageUrl=?, category=?, type=?, date=?, content=?, author=? WHERE id=?`
        )
            .bind(
                project.title,
                project.subtitle || '',
                project.description,
                JSON.stringify(project.tech),
                JSON.stringify(project.tags),
                project.imageUrl,
                project.category,
                project.type || 'work',
                project.date,
                project.content,
                JSON.stringify(project.author),
                id
            )
            .run();

        console.log('[API] Update result:', info);

        if (info.success) {
            return Response.json(project);
        } else {
            console.error('[API] Update failed:', info);
            return Response.json({ error: "Failed to update" }, { status: 500 });
        }
    } catch (err) {
        console.error('[API] Error updating project:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const id = context.params.id;
    try {
        await context.env.DB.prepare("DELETE FROM Project WHERE id = ?").bind(id).run();
        return Response.json({ message: "Deleted" });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
