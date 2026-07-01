export interface DataEnv {
    DB: D1Database;
}

export const normalizeEntryType = (value?: string | null): 'work' | 'blog' | 'page' => {
    if (value === 'blog' || value === 'page') return value;
    return 'work';
};

export const categoryId = (type: string, name: string): string =>
    `${normalizeEntryType(type)}:${name.trim().toLowerCase().replace(/\s+/g, '-')}`;

export const ensureAdminDataSchema = async (db: D1Database): Promise<void> => {
    await db.batch([
        db.prepare(`
            CREATE TABLE IF NOT EXISTS Category (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'work',
                sortOrder INTEGER NOT NULL DEFAULT 0,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                UNIQUE(name, type)
            )
        `),
        db.prepare(`
            CREATE TABLE IF NOT EXISTS PageView (
                id TEXT PRIMARY KEY,
                projectId TEXT,
                path TEXT NOT NULL,
                referrer TEXT,
                ipHash TEXT,
                day TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )
        `),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_day ON PageView(day)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_project ON PageView(projectId)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_path ON PageView(path)')
    ]);

    await db.prepare(`
        INSERT OR IGNORE INTO Category (id, name, type, sortOrder, createdAt, updatedAt)
        SELECT
            COALESCE(NULLIF(type, ''), 'work') || ':' || lower(replace(trim(category), ' ', '-')) AS id,
            trim(category) AS name,
            COALESCE(NULLIF(type, ''), 'work') AS type,
            0 AS sortOrder,
            datetime('now') AS createdAt,
            datetime('now') AS updatedAt
        FROM Project
        WHERE category IS NOT NULL AND trim(category) != ''
        GROUP BY trim(category), COALESCE(NULLIF(type, ''), 'work')
    `).run();
};
