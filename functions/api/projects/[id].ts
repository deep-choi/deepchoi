
interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema, normalizeSecondaryPlacement } from '../../_utils/schema';
import { buildAutomaticSeo } from '../../_utils/seo';

const normalizeProject = (project: any) => ({
    ...project,
    ...normalizeSecondaryPlacement(project),
    tech: JSON.parse(project.tech as string || '[]'),
    tags: JSON.parse(project.tags as string || '[]'),
    seoKeywords: JSON.parse(project.seoKeywords as string || '[]'),
    noIndex: Boolean(project.noIndex),
    author: JSON.parse(project.author as string || '{}')
});

const decodePathPart = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const rawId = Array.isArray(context.params.id) ? context.params.id.join('/') : context.params.id;
    const id = decodePathPart(String(rawId || ''));
    try {
        await ensureAdminDataSchema(context.env.DB);
        const project: any = await context.env.DB.prepare("SELECT * FROM Project WHERE id = ? OR slug = ?").bind(id, id).first();
        if (!project) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }
        return Response.json(normalizeProject(project));
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    const id = context.params.id;
    try {
        await ensureAdminDataSchema(context.env.DB);
        const payload: any = await context.request.json();
        const existingProject = await context.env.DB.prepare("SELECT * FROM Project WHERE id = ?").bind(id).first();
        const project = { ...buildAutomaticSeo(payload, existingProject), ...normalizeSecondaryPlacement(payload) };
        console.log('[API] Updating project:', id);
        console.log('[API] Content length:', project.content?.length);

        const info = await context.env.DB.prepare(
            `UPDATE Project SET slug=?, title=?, subtitle=?, description=?, seoTitle=?, seoDescription=?, seoImage=?, seoKeywords=?, noIndex=?, tech=?, tags=?, imageUrl=?, category=?, type=?, secondaryType=?, secondaryCategory=?, date=?, content=?, author=? WHERE id=?`
        )
            .bind(
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
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    const id = context.params.id;
    try {
        await context.env.DB.prepare("DELETE FROM Project WHERE id = ?").bind(id).run();
        return Response.json({ message: "Deleted" });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
};
