
interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { isAdminRequest, requireAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema, normalizeSecondaryPlacement } from '../../_utils/schema';
import { buildAutomaticSeo } from '../../_utils/seo';

const normalizeProject = (project: any) => ({
    ...project,
    ...normalizeSecondaryPlacement(project),
    tech: JSON.parse(project.tech as string || '[]'),
    tags: JSON.parse(project.tags as string || '[]'),
    seoKeywords: JSON.parse(project.seoKeywords as string || '[]'),
    noIndex: Boolean(project.noIndex),
    isPrivate: Boolean(project.isPrivate),
    author: JSON.parse(project.author as string || '{}')
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);
        const isAdmin = await isAdminRequest(context.request, context.env);
        const { results } = await context.env.DB.prepare(
            `SELECT id, slug, title, subtitle, description, seoTitle, seoDescription, seoImage, seoKeywords, noIndex, tech, tags, imageUrl, category, type, secondaryType, secondaryCategory, isPrivate, date, author FROM Project${isAdmin ? '' : ' WHERE COALESCE(isPrivate, 0) = 0'}`
        ).all();
        const projects = results.map(normalizeProject);
        // The admin list includes private entries, so it must never be cached or shared.
        return isAdmin
            ? Response.json(projects, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
            : Response.json(projects);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);
        const payload: any = await context.request.json();
        const project = { ...buildAutomaticSeo(payload), ...normalizeSecondaryPlacement(payload) };
        const info = await context.env.DB.prepare(
            `INSERT INTO Project (id, slug, title, subtitle, description, seoTitle, seoDescription, seoImage, seoKeywords, noIndex, tech, tags, imageUrl, category, type, secondaryType, secondaryCategory, isPrivate, date, content, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(
                project.id,
                project.slug || '',
                project.title,
                project.subtitle || '',
                project.description || '',
                project.seoTitle || '',
                project.seoDescription || '',
                project.seoImage || '',
                JSON.stringify(project.seoKeywords || []),
                project.noIndex ? 1 : 0,
                JSON.stringify(project.tech),
                JSON.stringify(project.tags),
                project.imageUrl,
                project.category,
                project.type || 'work',
                project.secondaryType,
                project.secondaryCategory,
                payload.isPrivate ? 1 : 0,
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
