interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema } from '../../_utils/schema';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);

        const totals: any = await context.env.DB.prepare(`
            SELECT
                COUNT(*) AS totalEntries,
                SUM(CASE WHEN type = 'blog' THEN 1 ELSE 0 END) AS blogEntries,
                SUM(CASE WHEN type = 'work' OR type IS NULL OR type = '' THEN 1 ELSE 0 END) AS workEntries,
                SUM(CASE WHEN type = 'page' THEN 1 ELSE 0 END) AS pageEntries,
                COUNT(DISTINCT category) AS categoryCount
            FROM Project
        `).first();

        const comments: any = await context.env.DB.prepare(
            'SELECT COUNT(*) AS totalComments FROM Comment'
        ).first();

        const categoryTotals: any = await context.env.DB.prepare(
            'SELECT COUNT(*) AS categoryCount FROM Category'
        ).first();

        const views: any = await context.env.DB.prepare(`
            SELECT
                COUNT(*) AS totalViews,
                COUNT(DISTINCT ipHash) AS uniqueVisitors,
                SUM(CASE WHEN day = ? THEN 1 ELSE 0 END) AS todayViews
            FROM PageView
        `).bind(new Date().toISOString().slice(0, 10)).first();

        const { results: recentEntries } = await context.env.DB.prepare(`
            SELECT id, title, category, type, date
            FROM Project
            ORDER BY date DESC
            LIMIT 8
        `).all();

        const { results: categories } = await context.env.DB.prepare(`
            SELECT
                c.id,
                c.name,
                c.type,
                c.sortOrder,
                COUNT(p.id) AS entryCount
            FROM Category c
            LEFT JOIN Project p
                ON p.category = c.name
                AND COALESCE(NULLIF(p.type, ''), 'work') = c.type
            GROUP BY c.id
            ORDER BY c.type, c.sortOrder, c.name
        `).all();

        const { results: topEntries } = await context.env.DB.prepare(`
            SELECT
                p.id,
                p.title,
                p.category,
                COALESCE(NULLIF(p.type, ''), 'work') AS type,
                COUNT(v.id) AS views,
                COUNT(DISTINCT v.ipHash) AS uniqueVisitors,
                MAX(v.createdAt) AS lastViewedAt
            FROM Project p
            LEFT JOIN PageView v ON v.projectId = p.id
            GROUP BY p.id
            ORDER BY views DESC, p.date DESC
            LIMIT 10
        `).all();

        const { results: dailyViews } = await context.env.DB.prepare(`
            SELECT
                day,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            WHERE day >= date('now', '-13 days')
            GROUP BY day
            ORDER BY day ASC
        `).all();

        const { results: popularPaths } = await context.env.DB.prepare(`
            SELECT
                path,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors,
                MAX(createdAt) AS lastViewedAt
            FROM PageView
            GROUP BY path
            ORDER BY views DESC
            LIMIT 8
        `).all();

        return Response.json({
            user: auth.user,
            totals: {
                totalEntries: Number(totals?.totalEntries || 0),
                blogEntries: Number(totals?.blogEntries || 0),
                workEntries: Number(totals?.workEntries || 0),
                pageEntries: Number(totals?.pageEntries || 0),
                categoryCount: Number(categoryTotals?.categoryCount || totals?.categoryCount || 0),
                totalComments: Number(comments?.totalComments || 0)
            },
            recentEntries,
            categories: categories.map((category: any) => ({
                ...category,
                category: category.name,
                entryCount: Number(category.entryCount || 0)
            })),
            analytics: {
                totalViews: Number(views?.totalViews || 0),
                uniqueVisitors: Number(views?.uniqueVisitors || 0),
                todayViews: Number(views?.todayViews || 0),
                topEntries: topEntries.map((entry: any) => ({
                    ...entry,
                    views: Number(entry.views || 0),
                    uniqueVisitors: Number(entry.uniqueVisitors || 0)
                })),
                dailyViews: dailyViews.map((day: any) => ({
                    ...day,
                    views: Number(day.views || 0),
                    uniqueVisitors: Number(day.uniqueVisitors || 0)
                })),
                popularPaths: popularPaths.map((path: any) => ({
                    ...path,
                    views: Number(path.views || 0),
                    uniqueVisitors: Number(path.uniqueVisitors || 0)
                }))
            }
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load admin summary';
        return Response.json({ error: message }, { status: 500 });
    }
};
