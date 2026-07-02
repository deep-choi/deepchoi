export type EntryType = 'work' | 'blog' | 'page';

export interface CategoryRecord {
    id: string;
    name: string;
    type: EntryType;
    sortOrder: number;
    entryCount: number;
}

const API_URL = '/api/categories';

const fallbackCategories: CategoryRecord[] = [
    { id: 'work:ui-ux', name: 'UI UX', type: 'work', sortOrder: 0, entryCount: 0 },
    { id: 'work:바이브코딩', name: '바이브코딩', type: 'work', sortOrder: 1, entryCount: 0 },
    { id: 'blog:ai', name: 'AI', type: 'blog', sortOrder: 0, entryCount: 0 },
    { id: 'blog:ui-ux', name: 'UI UX', type: 'blog', sortOrder: 1, entryCount: 0 }
];

export const categoryLabel = (name: string): string => name === 'UI UX' ? 'UI/UX' : name;

export const normalizeCategoryQuery = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/\+/g, ' ')
        .replace(/&/g, 'and')
        .replace(/[\/\s_-]+/g, '');

const categoryAliases: Record<string, string[]> = {
    'UI UX': ['uiux', 'ui/ux', 'ui-ux'],
    '바이브코딩': ['vibecoding', 'vibe-coding'],
    AI: ['ai']
};

export const categoryMatchesQuery = (categoryName: string, queryValue: string | null): boolean => {
    if (!queryValue) return false;

    const decodedQuery = decodeURIComponent(queryValue);
    const queryKey = normalizeCategoryQuery(decodedQuery);
    const keys = [
        categoryName,
        categoryLabel(categoryName),
        ...(categoryAliases[categoryName] || [])
    ].map(normalizeCategoryQuery);

    return keys.includes(queryKey);
};

export const findCategoryByQuery = (categoryNames: string[], queryValue: string | null): string | undefined =>
    categoryNames.find(category => categoryMatchesQuery(category, queryValue));

const readError = async (res: Response, fallback: string): Promise<string> => {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    return payload?.error || fallback;
};

export const categoryService = {
    getCategories: async (type?: EntryType): Promise<CategoryRecord[]> => {
        try {
            const url = type ? `${API_URL}?type=${encodeURIComponent(type)}` : API_URL;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch categories');
            return await res.json();
        } catch (err) {
            console.error(err);
            return type ? fallbackCategories.filter(category => category.type === type) : fallbackCategories;
        }
    },

    createCategory: async (name: string, type: EntryType): Promise<void> => {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type })
        });
        if (!res.ok) {
            throw new Error(await readError(res, '카테고리 생성에 실패했습니다.'));
        }
    },

    updateCategory: async (id: string, payload: { name: string; type?: EntryType; sortOrder?: number }): Promise<void> => {
        const res = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            throw new Error(await readError(res, '카테고리 수정에 실패했습니다.'));
        }
    },

    deleteCategory: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok) {
            throw new Error(await readError(res, '카테고리 삭제에 실패했습니다.'));
        }
    }
};
