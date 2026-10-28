interface Env {
    DB: D1Database;
}

import { ensureAdminDataSchema } from './_utils/schema';

const SITE_ORIGIN = 'https://deepchoi.com';

const escapeXml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const toDate = (value?: string): string => {
    if (!value) return new Date().toISOString().slice(0, 10);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return value.slice(0, 10);
};

const urlEntry = (path: string, lastmod: string, changefreq: string, priority: string): string => `  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}${path}`)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        await ensureAdminDataSchema(context.env.DB);

        const { results } = await context.env.DB.prepare(`
            SELECT id, slug, type, date
            FROM Project
            WHERE COALESCE(noIndex, 0) = 0
                AND COALESCE(isPrivate, 0) = 0
                AND COALESCE(NULLIF(type, ''), 'work') IN ('work', 'blog')
            ORDER BY date DESC
        `).all();

        const today = new Date().toISOString().slice(0, 10);
        const entries = [
            urlEntry('/', today, 'weekly', '1.0'),
            urlEntry('/work', today, 'weekly', '0.9'),
            urlEntry('/blog', today, 'weekly', '0.8'),
            urlEntry('/news', today, 'daily', '0.7'),
            urlEntry('/contact', today, 'monthly', '0.7'),
            ...results.map((project: any) => {
                const path = `/post/${encodeURIComponent(project.slug || project.id)}`;
                const priority = project.type === 'blog' ? '0.7' : '0.8';
                return urlEntry(path, toDate(project.date), 'monthly', priority);
            })
        ];

        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=300'
            }
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate sitemap';
        return Response.json({ error: message }, { status: 500 });
    }
};
