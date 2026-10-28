export interface DataEnv {
    DB: D1Database;
}

export const CONTENT_ENTRY_TYPES = ['work', 'blog'] as const;

export const normalizeEntryType = (value?: string | null): 'work' | 'blog' | 'page' => {
    if (value === 'blog' || value === 'page') return value;
    return 'work';
};

export const isContentEntryType = (value?: string | null): value is 'work' | 'blog' =>
    value === 'work' || value === 'blog';

export const normalizeGroupName = (value: unknown): string | null => {
    const name = String(value ?? '').trim();
    return name || null;
};

export const categoryId = (type: string, name: string): string =>
    `${normalizeEntryType(type)}:${name.trim().toLowerCase().replace(/\s+/g, '-')}`;

/**
 * An entry can also be listed under the other content type with its own category there.
 * Pages and same-type values are dropped so the primary type stays the single source of truth.
 */
export const normalizeSecondaryPlacement = (project: any): { secondaryType: 'work' | 'blog' | null; secondaryCategory: string | null } => {
    const primary = normalizeEntryType(project?.type);
    const secondary = project?.secondaryType;
    if (primary === 'page' || !isContentEntryType(secondary) || secondary === primary) {
        return { secondaryType: null, secondaryCategory: null };
    }
    return { secondaryType: secondary, secondaryCategory: String(project?.secondaryCategory || '').trim() };
};

/** SQL condition matching entries that belong to a category, as primary or secondary placement. */
export const projectInCategorySql = (projectAlias: string, categoryAlias: string): string => `(
    (${projectAlias}.category = ${categoryAlias}.name AND COALESCE(NULLIF(${projectAlias}.type, ''), 'work') = ${categoryAlias}.type)
    OR (${projectAlias}.secondaryCategory = ${categoryAlias}.name AND ${projectAlias}.secondaryType = ${categoryAlias}.type)
)`;

const defaultCategories = [
    { id: 'work:ui-ux', name: 'UI UX', type: 'work', sortOrder: 0 },
    { id: 'work:바이브코딩', name: '바이브코딩', type: 'work', sortOrder: 1 },
    { id: 'blog:ai', name: 'AI', type: 'blog', sortOrder: 0 },
    { id: 'blog:ui-ux', name: 'UI UX', type: 'blog', sortOrder: 1 }
] as const;

const normalizeContentCategorySortOrders = async (db: D1Database): Promise<void> => {
    for (const type of CONTENT_ENTRY_TYPES) {
        const { results } = await db.prepare(`
            SELECT id, sortOrder
            FROM Category
            WHERE type = ?
            ORDER BY sortOrder, name
        `).bind(type).all();

        const updates = results
            .map((category: any, sortOrder) => Number(category.sortOrder) === sortOrder
                ? null
                : db.prepare('UPDATE Category SET sortOrder = ? WHERE id = ?').bind(sortOrder, category.id))
            .filter(Boolean) as D1PreparedStatement[];

        if (updates.length > 0) {
            await db.batch(updates);
        }
    }
};

const ensureProjectSeoColumns = async (db: D1Database): Promise<void> => {
    const projectColumns: any = await db.prepare('PRAGMA table_info(Project)').all();
    const columnNames = new Set((projectColumns.results || []).map((column: any) => column.name));
    const columnDefinitions = [
        ['slug', 'TEXT'],
        ['seoTitle', 'TEXT'],
        ['seoDescription', 'TEXT'],
        ['seoImage', 'TEXT'],
        ['seoKeywords', 'TEXT'],
        ['noIndex', 'INTEGER NOT NULL DEFAULT 0'],
        ['secondaryType', 'TEXT'],
        ['secondaryCategory', 'TEXT'],
        ['isPrivate', 'INTEGER NOT NULL DEFAULT 0'],
        // Admin-chosen position at the top of lists; NULL entries follow by date.
        ['pinOrder', 'INTEGER']
    ] as const;

    for (const [name, definition] of columnDefinitions) {
        if (!columnNames.has(name)) {
            await db.prepare(`ALTER TABLE Project ADD COLUMN ${name} ${definition}`).run();
        }
    }
};

const ensureCategoryGroupColumn = async (db: D1Database): Promise<void> => {
    const categoryColumns: any = await db.prepare('PRAGMA table_info(Category)').all();
    const columnNames = new Set((categoryColumns.results || []).map((column: any) => column.name));
    if (!columnNames.has('groupName')) {
        // First-level grouping shown above the categories, e.g. "학습 기록" > Python.
        await db.prepare('ALTER TABLE Category ADD COLUMN groupName TEXT').run();
    }
    if (!columnNames.has('section')) {
        // Which list a blog category belongs to: 'news' for /news, NULL for /blog.
        await db.prepare('ALTER TABLE Category ADD COLUMN section TEXT').run();
        // News used to be identified by this first-level group.
        await db.prepare("UPDATE Category SET section = 'news' WHERE type = 'blog' AND groupName = 'AI 소식'").run();
    }
};

export const normalizeSection = (value: unknown): 'news' | null => (value === 'news' ? 'news' : null);

const ensurePageViewAnalyticsColumns = async (db: D1Database): Promise<void> => {
    const pageViewColumns: any = await db.prepare('PRAGMA table_info(PageView)').all();
    const columnNames = new Set((pageViewColumns.results || []).map((column: any) => column.name));
    const columnDefinitions = [
        ['referrerHost', 'TEXT'],
        ['source', 'TEXT'],
        ['deviceType', 'TEXT'],
        ['browser', 'TEXT'],
        ['os', 'TEXT'],
        ['utmSource', 'TEXT'],
        ['utmMedium', 'TEXT'],
        ['utmCampaign', 'TEXT'],
        ['country', 'TEXT'],
        ['region', 'TEXT']
    ] as const;

    for (const [name, definition] of columnDefinitions) {
        if (!columnNames.has(name)) {
            await db.prepare(`ALTER TABLE PageView ADD COLUMN ${name} ${definition}`).run();
        }
    }
};

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
            CREATE TABLE IF NOT EXISTS Comment (
                id TEXT PRIMARY KEY,
                projectId TEXT,
                content TEXT,
                author TEXT,
                date TEXT,
                status TEXT NOT NULL DEFAULT 'visible'
            )
        `),
        db.prepare(`
            CREATE TABLE IF NOT EXISTS PageView (
                id TEXT PRIMARY KEY,
                projectId TEXT,
                path TEXT NOT NULL,
                referrer TEXT,
                referrerHost TEXT,
                source TEXT,
                deviceType TEXT,
                browser TEXT,
                os TEXT,
                utmSource TEXT,
                utmMedium TEXT,
                utmCampaign TEXT,
                country TEXT,
                region TEXT,
                ipHash TEXT,
                day TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )
        `),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_day ON PageView(day)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_project ON PageView(projectId)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_path ON PageView(path)')
    ]);

    const commentColumns: any = await db.prepare('PRAGMA table_info(Comment)').all();
    const hasCommentStatus = commentColumns.results?.some((column: any) => column.name === 'status');
    if (!hasCommentStatus) {
        await db.prepare("ALTER TABLE Comment ADD COLUMN status TEXT NOT NULL DEFAULT 'visible'").run();
    }

    await ensureProjectSeoColumns(db);
    await ensureCategoryGroupColumn(db);
    await ensurePageViewAnalyticsColumns(db);

    await db.batch([
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_source ON PageView(source)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_device ON PageView(deviceType)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_country ON PageView(country)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_page_view_region ON PageView(region)')
    ]);

    const now = new Date().toISOString();
    await db.batch(defaultCategories.map(category =>
        db.prepare(`
            INSERT OR IGNORE INTO Category (id, name, type, sortOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(category.id, category.name, category.type, category.sortOrder, now, now)
    ));

    await db.prepare(`
        INSERT OR IGNORE INTO Category (id, name, type, sortOrder, createdAt, updatedAt)
        SELECT
            COALESCE(NULLIF(type, ''), 'work') || ':' || lower(replace(trim(category), ' ', '-')) AS id,
            trim(category) AS name,
            COALESCE(NULLIF(type, ''), 'work') AS type,
            100 AS sortOrder,
            datetime('now') AS createdAt,
            datetime('now') AS updatedAt
        FROM Project
        WHERE category IS NOT NULL
            AND trim(category) != ''
            AND COALESCE(NULLIF(type, ''), 'work') IN ('work', 'blog')
        GROUP BY trim(category), COALESCE(NULLIF(type, ''), 'work')
    `).run();

    await db.prepare(`
        INSERT OR IGNORE INTO Category (id, name, type, sortOrder, createdAt, updatedAt)
        SELECT
            secondaryType || ':' || lower(replace(trim(secondaryCategory), ' ', '-')) AS id,
            trim(secondaryCategory) AS name,
            secondaryType AS type,
            100 AS sortOrder,
            datetime('now') AS createdAt,
            datetime('now') AS updatedAt
        FROM Project
        WHERE secondaryCategory IS NOT NULL
            AND trim(secondaryCategory) != ''
            AND secondaryType IN ('work', 'blog')
        GROUP BY trim(secondaryCategory), secondaryType
    `).run();

    await normalizeContentCategorySortOrders(db);
};
