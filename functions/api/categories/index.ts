interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';
import { categoryId, ensureAdminDataSchema, normalizeEntryType } from '../../_utils/schema';

const categorySelect = `
    SELECT
        c.id,
        c.name,
        c.type,
        c.sortOrder,
        c.createdAt,
        c.updatedAt,
        COUNT(p.id) AS entryCount
    FROM Category c
    LEFT JOIN Project p
        ON p.category = c.name
        AND COALESCE(NULLIF(p.type, ''), 'work') = c.type
`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);

        const type = new URL(context.request.url).searchParams.get('type');
        const normalizedType = type ? normalizeEntryType(type) : null;
        const query = normalizedType
            ? `${categorySelect} WHERE c.type = ? GROUP BY c.id ORDER BY c.sortOrder, c.name`
            : `${categorySelect} GROUP BY c.id ORDER BY c.type, c.sortOrder, c.name`;
        const statement = normalizedType
            ? context.env.DB.prepare(query).bind(normalizedType)
            : context.env.DB.prepare(query);
        const { results } = await statement.all();

        return Response.json(results.map((category: any) => ({
            ...category,
            entryCount: Number(category.entryCount || 0)
        })));
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load categories';
        return Response.json({ error: message }, { status: 500 });
    }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);

        const payload = await context.request.json() as any;
        const name = String(payload.name || '').trim();
        const type = normalizeEntryType(payload.type);
        const now = new Date().toISOString();

        if (!name) {
            return Response.json({ error: 'Category name is required' }, { status: 400 });
        }

        await context.env.DB.prepare(`
            INSERT INTO Category (id, name, type, sortOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID?.() || categoryId(type, name),
            name,
            type,
            Number(payload.sortOrder || 0),
            now,
            now
        ).run();

        return Response.json({ ok: true }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create category';
        const status = message.includes('UNIQUE') ? 409 : 500;
        return Response.json({ error: status === 409 ? '이미 있는 카테고리입니다.' : message }, { status });
    }
};
