interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
}

import { requireAdmin } from '../../_utils/auth';
import { ensureAdminDataSchema } from '../../_utils/schema';

const sourceLabels: Record<string, string> = {
    direct: '직접 방문',
    internal: '내부 이동',
    search: '검색',
    social: '소셜',
    external: '외부 링크',
    campaign: '캠페인'
};

const deviceLabels: Record<string, string> = {
    desktop: '데스크톱',
    mobile: '모바일',
    tablet: '태블릿',
    bot: '봇'
};

const percentageChange = (current: number, previous: number): number | null => {
    if (previous === 0) {
        if (current === 0) return 0;
        return null;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

const toMetricRows = (rows: any[], labelMap?: Record<string, string>) => rows.map((row: any) => {
    const key = String(row.key || row.source || row.deviceType || row.browser || row.os || row.referrerHost || 'unknown');
    return {
        key,
        label: labelMap?.[key] || key,
        views: Number(row.views || 0),
        uniqueVisitors: Number(row.uniqueVisitors || 0)
    };
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    try {
        await ensureAdminDataSchema(context.env.DB);

        const searchParams = new URL(context.request.url).searchParams;
        const rangeParam = searchParams.get('range') || '14';
        const rangeDays = rangeParam === 'all'
            ? null
            : (['7', '14', '30'].includes(rangeParam) ? Number(rangeParam) : 14);
        const rangeDateModifier = rangeDays ? `-${rangeDays - 1} days` : null;
        const previousStartModifier = rangeDays ? `-${(rangeDays * 2) - 1} days` : null;
        const previousEndModifier = rangeDays ? `-${rangeDays} days` : null;
        const humanVisitorFilter = "COALESCE(deviceType, '') != 'bot'";
        const rangeWhere = rangeDays
            ? `WHERE ${humanVisitorFilter} AND day >= date('now', ?)`
            : `WHERE ${humanVisitorFilter}`;
        const rangeJoin = rangeDays ? "AND v.day >= date('now', ?)" : '';

        const totals: any = await context.env.DB.prepare(`
            SELECT
                COUNT(*) AS totalEntries,
                SUM(CASE WHEN type = 'blog' THEN 1 ELSE 0 END) AS blogEntries,
                SUM(CASE WHEN type = 'work' OR type IS NULL OR type = '' THEN 1 ELSE 0 END) AS workEntries,
                SUM(CASE WHEN type = 'page' THEN 1 ELSE 0 END) AS pageEntries,
                COUNT(DISTINCT category) AS categoryCount
            FROM Project
        `).first();

        const comments: any = await context.env.DB.prepare(`
            SELECT
                COUNT(*) AS totalComments,
                SUM(CASE WHEN COALESCE(status, 'visible') = 'hidden' THEN 1 ELSE 0 END) AS hiddenComments
            FROM Comment
        `).first();

        const categoryTotals: any = await context.env.DB.prepare(
            "SELECT COUNT(*) AS categoryCount FROM Category WHERE type IN ('work', 'blog')"
        ).first();

        const views: any = await context.env.DB.prepare(`
            SELECT
                COUNT(*) AS totalViews,
                COUNT(DISTINCT ipHash) AS uniqueVisitors,
                SUM(CASE WHEN day = ? THEN 1 ELSE 0 END) AS todayViews
            FROM PageView
            ${rangeWhere}
        `).bind(
            ...(rangeDateModifier
                ? [new Date().toISOString().slice(0, 10), rangeDateModifier]
                : [new Date().toISOString().slice(0, 10)])
        ).first();

        const previousViews: any = rangeDays
            ? await context.env.DB.prepare(`
                SELECT
                    COUNT(*) AS totalViews,
                    COUNT(DISTINCT ipHash) AS uniqueVisitors
                FROM PageView
                WHERE ${humanVisitorFilter}
                    AND day BETWEEN date('now', ?) AND date('now', ?)
            `).bind(previousStartModifier, previousEndModifier).first()
            : null;

        const botViewsStatement = context.env.DB.prepare(`
            SELECT COUNT(*) AS botViews
            FROM PageView
            WHERE COALESCE(deviceType, '') = 'bot'
            ${rangeDays ? "AND day >= date('now', ?)" : ''}
        `);
        const botViews: any = rangeDateModifier
            ? await botViewsStatement.bind(rangeDateModifier).first()
            : await botViewsStatement.first();

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
            WHERE c.type IN ('work', 'blog')
            GROUP BY c.id
            ORDER BY c.type, c.sortOrder, c.name
        `).all();

        const topEntriesStatement = context.env.DB.prepare(`
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
                AND COALESCE(v.deviceType, '') != 'bot'
                ${rangeJoin}
            GROUP BY p.id
            ORDER BY views DESC, p.date DESC
            LIMIT 10
        `);
        const { results: topEntries } = rangeDateModifier
            ? await topEntriesStatement.bind(rangeDateModifier).all()
            : await topEntriesStatement.all();

        const dailyViewsStatement = context.env.DB.prepare(`
            SELECT
                day,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere}
            GROUP BY day
            ORDER BY day ASC
        `);
        const { results: dailyViewRows } = rangeDateModifier
            ? await dailyViewsStatement.bind(rangeDateModifier).all()
            : await dailyViewsStatement.all();

        const dailyViewMap = new Map((dailyViewRows as any[]).map(row => [row.day, row]));
        const todayDate = new Date();
        todayDate.setUTCHours(0, 0, 0, 0);
        const todayDay = todayDate.toISOString().slice(0, 10);
        const firstTrackedDay = (dailyViewRows as any[])[0]?.day || todayDay;
        const firstDate = new Date(`${firstTrackedDay}T00:00:00Z`);
        const startDate = rangeDays
            ? new Date(todayDate)
            : (Number.isNaN(firstDate.getTime()) ? new Date(todayDate) : firstDate);

        if (rangeDays) {
            startDate.setUTCDate(startDate.getUTCDate() - (rangeDays - 1));
        }

        const dayCount = rangeDays || Math.max(
            1,
            Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000) + 1
        );
        const dailyViews = Array.from({ length: dayCount }, (_, index) => {
            const dayDate = new Date(startDate);
            dayDate.setUTCDate(dayDate.getUTCDate() + index);
            const day = dayDate.toISOString().slice(0, 10);
            const row = dailyViewMap.get(day);

            return {
                day,
                views: Number(row?.views || 0),
                uniqueVisitors: Number(row?.uniqueVisitors || 0)
            };
        });

        const popularPathsStatement = context.env.DB.prepare(`
            SELECT
                path,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors,
                MAX(createdAt) AS lastViewedAt
            FROM PageView
            ${rangeWhere}
            GROUP BY path
            ORDER BY views DESC
            LIMIT 8
        `);
        const { results: popularPaths } = rangeDateModifier
            ? await popularPathsStatement.bind(rangeDateModifier).all()
            : await popularPathsStatement.all();

        const sourceBreakdownStatement = context.env.DB.prepare(`
            SELECT
                COALESCE(NULLIF(source, ''), 'direct') AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere}
            GROUP BY COALESCE(NULLIF(source, ''), 'direct')
            ORDER BY views DESC
            LIMIT 8
        `);
        const { results: sourceBreakdown } = rangeDateModifier
            ? await sourceBreakdownStatement.bind(rangeDateModifier).all()
            : await sourceBreakdownStatement.all();

        const referrerHostsStatement = context.env.DB.prepare(`
            SELECT
                referrerHost AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere ? `${rangeWhere} AND` : 'WHERE'} referrerHost IS NOT NULL
                AND referrerHost != ''
            GROUP BY referrerHost
            ORDER BY views DESC
            LIMIT 8
        `);
        const { results: referrerHosts } = rangeDateModifier
            ? await referrerHostsStatement.bind(rangeDateModifier).all()
            : await referrerHostsStatement.all();

        const deviceBreakdownStatement = context.env.DB.prepare(`
            SELECT
                COALESCE(NULLIF(deviceType, ''), 'unknown') AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere}
            GROUP BY COALESCE(NULLIF(deviceType, ''), 'unknown')
            ORDER BY views DESC
        `);
        const { results: deviceBreakdown } = rangeDateModifier
            ? await deviceBreakdownStatement.bind(rangeDateModifier).all()
            : await deviceBreakdownStatement.all();

        const browserBreakdownStatement = context.env.DB.prepare(`
            SELECT
                COALESCE(NULLIF(browser, ''), 'Other') AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere}
            GROUP BY COALESCE(NULLIF(browser, ''), 'Other')
            ORDER BY views DESC
            LIMIT 6
        `);
        const { results: browserBreakdown } = rangeDateModifier
            ? await browserBreakdownStatement.bind(rangeDateModifier).all()
            : await browserBreakdownStatement.all();

        const osBreakdownStatement = context.env.DB.prepare(`
            SELECT
                COALESCE(NULLIF(os, ''), 'Other') AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere}
            GROUP BY COALESCE(NULLIF(os, ''), 'Other')
            ORDER BY views DESC
            LIMIT 6
        `);
        const { results: osBreakdown } = rangeDateModifier
            ? await osBreakdownStatement.bind(rangeDateModifier).all()
            : await osBreakdownStatement.all();

        const countryBreakdownStatement = context.env.DB.prepare(`
            SELECT
                country AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere ? `${rangeWhere} AND` : 'WHERE'} country IS NOT NULL
                AND country != ''
            GROUP BY country
            ORDER BY views DESC
            LIMIT 8
        `);
        const { results: countryBreakdown } = rangeDateModifier
            ? await countryBreakdownStatement.bind(rangeDateModifier).all()
            : await countryBreakdownStatement.all();

        const regionBreakdownStatement = context.env.DB.prepare(`
            SELECT
                CASE
                    WHEN country IS NULL OR country = '' THEN region
                    ELSE country || ' · ' || region
                END AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere ? `${rangeWhere} AND` : 'WHERE'} region IS NOT NULL
                AND region != ''
            GROUP BY country, region
            ORDER BY views DESC
            LIMIT 8
        `);
        const { results: regionBreakdown } = rangeDateModifier
            ? await regionBreakdownStatement.bind(rangeDateModifier).all()
            : await regionBreakdownStatement.all();

        const campaignBreakdownStatement = context.env.DB.prepare(`
            SELECT
                utmCampaign AS key,
                COUNT(*) AS views,
                COUNT(DISTINCT ipHash) AS uniqueVisitors
            FROM PageView
            ${rangeWhere ? `${rangeWhere} AND` : 'WHERE'} utmCampaign IS NOT NULL
                AND utmCampaign != ''
            GROUP BY utmCampaign
            ORDER BY views DESC
            LIMIT 8
        `);
        const { results: campaignBreakdown } = rangeDateModifier
            ? await campaignBreakdownStatement.bind(rangeDateModifier).all()
            : await campaignBreakdownStatement.all();

        const lastTracked: any = await context.env.DB.prepare(`
            SELECT MAX(createdAt) AS lastTrackedAt
            FROM PageView
            WHERE ${humanVisitorFilter}
        `).first();

        const totalViews = Number(views?.totalViews || 0);
        const uniqueVisitors = Number(views?.uniqueVisitors || 0);
        const previousTotalViews = Number(previousViews?.totalViews || 0);
        const previousUniqueVisitors = Number(previousViews?.uniqueVisitors || 0);

        const { results: recentComments } = await context.env.DB.prepare(`
            SELECT
                c.id,
                c.projectId,
                c.content,
                c.author,
                c.date,
                COALESCE(c.status, 'visible') AS status,
                p.title AS projectTitle
            FROM Comment c
            LEFT JOIN Project p ON p.id = c.projectId
            ORDER BY c.date DESC
            LIMIT 50
        `).all();

        return Response.json({
            user: auth.user,
            totals: {
                totalEntries: Number(totals?.totalEntries || 0),
                blogEntries: Number(totals?.blogEntries || 0),
                workEntries: Number(totals?.workEntries || 0),
                pageEntries: Number(totals?.pageEntries || 0),
                categoryCount: Number(categoryTotals?.categoryCount || totals?.categoryCount || 0),
                totalComments: Number(comments?.totalComments || 0),
                hiddenComments: Number(comments?.hiddenComments || 0)
            },
            recentEntries,
            categories: categories.map((category: any) => ({
                ...category,
                category: category.name,
                entryCount: Number(category.entryCount || 0)
            })),
            analytics: {
                totalViews,
                uniqueVisitors,
                todayViews: Number(views?.todayViews || 0),
                previousTotalViews,
                previousUniqueVisitors,
                viewChangeRate: percentageChange(totalViews, previousTotalViews),
                uniqueVisitorChangeRate: percentageChange(uniqueVisitors, previousUniqueVisitors),
                botViews: Number(botViews?.botViews || 0),
                lastTrackedAt: lastTracked?.lastTrackedAt || null,
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
                })),
                sourceBreakdown: toMetricRows(sourceBreakdown, sourceLabels),
                referrerHosts: toMetricRows(referrerHosts),
                deviceBreakdown: toMetricRows(deviceBreakdown, deviceLabels),
                browserBreakdown: toMetricRows(browserBreakdown),
                osBreakdown: toMetricRows(osBreakdown),
                countryBreakdown: toMetricRows(countryBreakdown),
                regionBreakdown: toMetricRows(regionBreakdown),
                campaignBreakdown: toMetricRows(campaignBreakdown)
            },
            recentComments: recentComments.map((comment: any) => ({
                ...comment,
                author: JSON.parse(comment.author || '{}')
            }))
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load admin summary';
        return Response.json({ error: message }, { status: 500 });
    }
};
