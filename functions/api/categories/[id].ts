interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema, isContentEntryType, normalizeEntryType, normalizeGroupName } from '../../_utils/schema';

const getCategoryIdParam = (value: string | string[] | undefined): string => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (!rawValue) return '';

    try {
        return decodeURIComponent(rawValue);
    } catch {
        return rawValue;
    }
};

const getCategory = async (db: D1Database, id: string): Promise<any | null> =>
    db.prepare('SELECT * FROM Category WHERE id = ?').bind(id).first();

const getEntryCount = async (db: D1Database, category: any): Promise<number> => {
    const result: any = await db.prepare(`
        SELECT COUNT(*) AS entryCount
        FROM Project
        WHERE (category = ? AND COALESCE(NULLIF(type, ''), 'work') = ?)
            OR (secondaryCategory = ? AND secondaryType = ?)
    `).bind(category.name, category.type, category.name, category.type).first();

    return Number(result?.entryCount || 0);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);

        const id = getCategoryIdParam(context.params.id);
        const category = await getCategory(context.env.DB, id);
        if (!category) {
            return Response.json({ error: 'Category not found' }, { status: 404 });
        }

        const payload = await context.request.json() as any;
        const name = String(payload.name || '').trim();
        const nextType = payload.type ? normalizeEntryType(payload.type) : category.type;
        const entryCount = await getEntryCount(context.env.DB, category);

        if (!name) {
            return Response.json({ error: 'Category name is required' }, { status: 400 });
        }
        if (!isContentEntryType(nextType)) {
            return Response.json({ error: '콘텐츠 카테고리는 Work 또는 Blog만 사용할 수 있습니다.' }, { status: 400 });
        }
        if (nextType !== category.type && entryCount > 0) {
            return Response.json({ error: '콘텐츠가 있는 카테고리는 타입을 바꿀 수 없습니다.' }, { status: 409 });
        }

        await context.env.DB.batch([
            context.env.DB.prepare(`
                UPDATE Category
                SET name = ?, type = ?, sortOrder = ?, groupName = ?, updatedAt = ?
                WHERE id = ?
            `).bind(
                name,
                nextType,
                Number(payload.sortOrder ?? category.sortOrder ?? 0),
                // Reordering sends no group; keep the stored one.
                payload.groupName === undefined ? normalizeGroupName(category.groupName) : normalizeGroupName(payload.groupName),
                new Date().toISOString(),
                id
            ),
            context.env.DB.prepare(`
                UPDATE Project
                SET category = ?
                WHERE category = ? AND COALESCE(NULLIF(type, ''), 'work') = ?
            `).bind(name, category.name, category.type),
            context.env.DB.prepare(`
                UPDATE Project
                SET secondaryCategory = ?
                WHERE secondaryCategory = ? AND secondaryType = ?
            `).bind(name, category.name, category.type)
        ]);

        return Response.json({ ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update category';
        const status = message.includes('UNIQUE') ? 409 : 500;
        return Response.json({ error: status === 409 ? '이미 있는 카테고리입니다.' : message }, { status });
    }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);

        const id = getCategoryIdParam(context.params.id);
        const category = await getCategory(context.env.DB, id);
        if (!category) {
            return Response.json({ error: 'Category not found' }, { status: 404 });
        }

        const entryCount = await getEntryCount(context.env.DB, category);
        if (entryCount > 0) {
            return Response.json({ error: '콘텐츠가 연결된 카테고리는 삭제할 수 없습니다. 먼저 글을 다른 카테고리로 옮겨주세요.' }, { status: 409 });
        }

        await context.env.DB.prepare('DELETE FROM Category WHERE id = ?').bind(id).run();
        return Response.json({ ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete category';
        return Response.json({ error: message }, { status: 500 });
    }
};
