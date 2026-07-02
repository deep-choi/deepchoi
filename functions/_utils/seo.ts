const SITE_NAME = 'Deepchoi';

const stripHtml = (value?: string): string =>
    String(value || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

const truncate = (value: string, maxLength: number): string =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

const slugify = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

const unique = (values: string[]): string[] =>
    Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

export const buildAutomaticSeo = (project: any, existingProject?: any) => {
    const title = String(project.title || existingProject?.title || '').trim();
    const subtitle = String(project.subtitle || existingProject?.subtitle || '').trim();
    const description = String(project.description || existingProject?.description || '').trim();
    const contentText = stripHtml(project.content || existingProject?.content || '');
    const type = project.type || existingProject?.type || 'work';
    const category = String(project.category || existingProject?.category || '').trim();
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const tech = Array.isArray(project.tech) ? project.tech : [];
    const date = String(project.date || existingProject?.date || new Date().toISOString().slice(0, 10));
    const existingSlug = String(project.slug || existingProject?.slug || '').trim();
    const slugSeed = title || subtitle || String(project.id || existingProject?.id || 'post');
    const datePrefix = date.slice(0, 10).replace(/-/g, '');
    const idTail = String(project.id || existingProject?.id || Date.now()).slice(-6);
    const generatedSlug = slugify(slugSeed);
    const fallbackSlug = generatedSlug ? `${generatedSlug}-${datePrefix}-${idTail}` : String(project.id || existingProject?.id || '');

    const fallbackDescription = description || subtitle || contentText;
    const keywords = unique([
        ...tags,
        ...tech,
        category,
        type === 'blog' ? '블로그' : '포트폴리오',
        'UI UX',
        '프론트엔드',
        'Deepchoi'
    ]).slice(0, 12);

    return {
        ...project,
        slug: existingSlug || fallbackSlug,
        seoTitle: truncate(title ? `${title} | ${SITE_NAME}` : SITE_NAME, 70),
        seoDescription: truncate(fallbackDescription || 'UI/UX 디자인과 프론트엔드 구현 과정을 정리한 Deepchoi 포트폴리오 글입니다.', 160),
        seoImage: project.seoImage || project.imageUrl || existingProject?.seoImage || existingProject?.imageUrl || '',
        seoKeywords: keywords,
        noIndex: Boolean(project.noIndex ?? existingProject?.noIndex ?? false)
    };
};
