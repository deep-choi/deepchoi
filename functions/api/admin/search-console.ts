interface Env {
    DB: D1Database;
    ADMIN_SESSION_SECRET?: string;
    GOOGLE_SEARCH_CONSOLE_SITE_URL?: string;
    GOOGLE_SEARCH_CONSOLE_CLIENT_ID?: string;
    GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?: string;
    GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN?: string;
}

import { requireAdmin } from '../../_utils/auth';

type SearchConsoleRow = {
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const toMetric = (row: SearchConsoleRow) => ({
    key: String(row.keys?.[0] || ''),
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Math.round(Number(row.position || 0) * 10) / 10
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const auth = await requireAdmin(context);
    if ('response' in auth) return auth.response;

    const {
        GOOGLE_SEARCH_CONSOLE_SITE_URL: siteUrl,
        GOOGLE_SEARCH_CONSOLE_CLIENT_ID: clientId,
        GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET: clientSecret,
        GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN: refreshToken
    } = context.env;

    if (!siteUrl || !clientId || !clientSecret || !refreshToken) {
        return Response.json({
            configured: false,
            message: 'Google Search Console 연결 정보가 아직 설정되지 않았습니다.'
        });
    }

    try {
        const requestedRange = new URL(context.request.url).searchParams.get('range') || '14';
        const rangeDays = requestedRange === 'all'
            ? 90
            : (['7', '14', '30'].includes(requestedRange) ? Number(requestedRange) : 14);
        const endDate = new Date();
        endDate.setUTCDate(endDate.getUTCDate() - 2);
        const startDate = new Date(endDate);
        startDate.setUTCDate(startDate.getUTCDate() - (rangeDays - 1));

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });
        const tokenPayload = await tokenResponse.json() as { access_token?: string; error_description?: string };
        if (!tokenResponse.ok || !tokenPayload.access_token) {
            throw new Error(tokenPayload.error_description || 'Google Search Console access token could not be issued.');
        }

        const requestSearchAnalytics = async (dimensions: string[], rowLimit: number) => {
            const response = await fetch(
                `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${tokenPayload.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        startDate: formatDate(startDate),
                        endDate: formatDate(endDate),
                        dimensions,
                        rowLimit,
                        type: 'web'
                    })
                }
            );
            const payload = await response.json() as { rows?: SearchConsoleRow[]; error?: { message?: string } };
            if (!response.ok) {
                throw new Error(payload.error?.message || 'Google Search Console data could not be loaded.');
            }
            return (payload.rows || []).map(toMetric);
        };

        const [keywords, pages] = await Promise.all([
            requestSearchAnalytics(['query'], 10),
            requestSearchAnalytics(['page'], 8)
        ]);

        return Response.json({
            configured: true,
            rangeDays,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            keywords,
            pages
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Google Search Console data could not be loaded.';
        return Response.json({ configured: true, error: message }, { status: 502 });
    }
};
