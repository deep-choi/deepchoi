
interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const { results } = await context.env.DB.prepare(
            "SELECT id, title, subtitle, tech, tags, imageUrl, category, type, date, author FROM Project"
        ).all();
        const projects = results.map(p => ({
            ...p,
            tech: JSON.parse(p.tech as string),
            tags: JSON.parse(p.tags as string),
            author: JSON.parse(p.author as string)
        }));
        return Response.json(projects);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        const project: any = await context.request.json();
        const info = await context.env.DB.prepare(
            `INSERT INTO Project (id, title, subtitle, description, tech, tags, imageUrl, category, type, date, content, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(
                project.id,
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
                JSON.stringify(project.author)
            )
            .run();

        if (info.success) {
            return Response.json(project, { status: 201 });
        } else {
            return Response.json({ error: "Failed to insert" }, { status: 500 });
        }
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
