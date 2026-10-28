interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';
import { categoryId, ensureAdminDataSchema, isContentEntryType, normalizeEntryType, normalizeGroupName, normalizeSection, projectInCategorySql } from '../../_utils/schema';

const categorySelect = `
    SELECT
        c.id,
        c.name,
        c.type,
        c.sortOrder,
        c.groupName,
        c.section,
        c.createdAt,
        c.updatedAt,
        COUNT(p.id) AS entryCount
    FROM Category c
    LEFT JOIN Project p
        ON ${projectInCategorySql('p', 'c')}
`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);

        const type = new URL(context.request.url).searchParams.get('type');
        const normalizedType = type ? normalizeEntryType(type) : null;
        if (normalizedType && !isContentEntryType(normalizedType)) {
            return Response.json([]);
        }
        const query = normalizedType
            ? `${categorySelect} WHERE c.type = ? GROUP BY c.id ORDER BY c.sortOrder, c.name`
            : `${categorySelect} WHERE c.type IN ('work', 'blog') GROUP BY c.id ORDER BY c.type, c.sortOrder, c.name`;
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
        if (!isContentEntryType(type)) {
            return Response.json({ error: '콘텐츠 카테고리는 Work 또는 Blog만 만들 수 있습니다.' }, { status: 400 });
        }

        const nextSortOrder: any = await context.env.DB.prepare(`
            SELECT COALESCE(MAX(sortOrder), -1) + 1 AS sortOrder
            FROM Category
            WHERE type = ?
        `).bind(type).first();

        const baseId = categoryId(type, name);
        let id = baseId;
        for (let suffix = 2; suffix < 100; suffix += 1) {
            const existing = await context.env.DB.prepare('SELECT id FROM Category WHERE id = ?').bind(id).first();
            if (!existing) break;
            id = `${baseId}-${suffix}`;
        }

        await context.env.DB.prepare(`
            INSERT INTO Category (id, name, type, sortOrder, groupName, section, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            name,
            type,
            Number(payload.sortOrder ?? nextSortOrder?.sortOrder ?? 0),
            normalizeGroupName(payload.groupName),
            type === 'blog' ? normalizeSection(payload.section) : null,
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
