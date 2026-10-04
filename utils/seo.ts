import { Project } from '../types';

const SITE_NAME = 'Deepchoi';
const SITE_ORIGIN = 'https://deepchoi.com';
const DEFAULT_TITLE = 'Deepchoi | Portfolio';
const DEFAULT_DESCRIPTION = 'UI/UX 디자인, 프론트엔드 구현, 바이브코딩 프로젝트를 정리한 Choi의 포트폴리오입니다.';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/social/portfolio.png`;

const stripHtml = (value: string): string =>
    value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const truncate = (value: string, maxLength: number): string =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

const absoluteUrl = (value?: string): string => {
    if (!value) return DEFAULT_IMAGE;
    if (value.startsWith('data:')) return DEFAULT_IMAGE;
    if (/^https?:\/\//i.test(value)) return value;
    return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
};

const setMeta = (selector: string, attribute: 'content' | 'href', value: string) => {
    let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
    if (!element) {
        element = selector.startsWith('link')
            ? document.createElement('link')
            : document.createElement('meta');

        const propertyMatch = selector.match(/property="([^"]+)"/);
        const nameMatch = selector.match(/name="([^"]+)"/);
        const relMatch = selector.match(/rel="([^"]+)"/);
        if (propertyMatch) element.setAttribute('property', propertyMatch[1]);
        if (nameMatch) element.setAttribute('name', nameMatch[1]);
        if (relMatch) element.setAttribute('rel', relMatch[1]);
        document.head.appendChild(element);
    }
    element.setAttribute(attribute, value);
};

export const getProjectPath = (project: Project): string =>
    `/post/${encodeURIComponent(project.slug || project.id)}`;

export const getProjectSeo = (project: Project) => {
    const title = truncate(project.seoTitle || `${project.title} | ${SITE_NAME}`, 70);
    const fallbackDescription = project.description || project.subtitle || stripHtml(project.content || '');
    const description = truncate(project.seoDescription || fallbackDescription || DEFAULT_DESCRIPTION, 160);
    const url = `${SITE_ORIGIN}${getProjectPath(project)}`;
    const image = absoluteUrl(project.seoImage || project.imageUrl);
    const keywords = (project.seoKeywords && project.seoKeywords.length > 0 ? project.seoKeywords : project.tags || [])
        .filter(Boolean)
        .join(', ');

    return { title, description, url, image, keywords };
};

export const applyProjectSeo = (project: Project) => {
    const seo = getProjectSeo(project);

    document.title = seo.title;
    setMeta('meta[name="description"]', 'content', seo.description);
    setMeta('meta[name="robots"]', 'content', project.noIndex ? 'noindex, nofollow' : 'index, follow');
    setMeta('link[rel="canonical"]', 'href', seo.url);
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[property="og:url"]', 'content', seo.url);
    setMeta('meta[property="og:title"]', 'content', seo.title);
    setMeta('meta[property="og:description"]', 'content', seo.description);
    setMeta('meta[property="og:image"]', 'content', seo.image);
    setMeta('meta[property="og:image:alt"]', 'content', project.title);
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', seo.title);
    setMeta('meta[name="twitter:description"]', 'content', seo.description);
    setMeta('meta[name="twitter:image"]', 'content', seo.image);
    if (seo.keywords) setMeta('meta[name="keywords"]', 'content', seo.keywords);

    const existingStructuredData = document.getElementById('project-structured-data');
    existingStructuredData?.remove();
    const script = document.createElement('script');
    script.id = 'project-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': project.type === 'blog' ? 'BlogPosting' : 'CreativeWork',
        headline: project.title,
        description: seo.description,
        image: seo.image,
        url: seo.url,
        datePublished: project.date,
        author: {
            '@type': 'Person',
            name: project.author?.name || 'Choi'
        },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME
        }
    });
    document.head.appendChild(script);
};

export const applyDefaultSeo = () => {
    document.title = DEFAULT_TITLE;
    setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION);
    setMeta('meta[name="robots"]', 'content', 'index, follow');
    setMeta('link[rel="canonical"]', 'href', `${SITE_ORIGIN}/`);
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:url"]', 'content', `${SITE_ORIGIN}/`);
    setMeta('meta[property="og:title"]', 'content', DEFAULT_TITLE);
    setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION);
    setMeta('meta[property="og:image"]', 'content', DEFAULT_IMAGE);
    setMeta('meta[name="twitter:title"]', 'content', DEFAULT_TITLE);
    setMeta('meta[name="twitter:description"]', 'content', DEFAULT_DESCRIPTION);
    setMeta('meta[name="twitter:image"]', 'content', DEFAULT_IMAGE);
    document.getElementById('project-structured-data')?.remove();
};
