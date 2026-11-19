import { Project } from '../types';

const SITE_NAME = 'Deepchoi';
const SITE_ORIGIN = 'https://deepchoi.com';
const DEFAULT_TITLE = 'Deepchoi | Portfolio';
const DEFAULT_DESCRIPTION = 'UI/UX 디자인, 프론트엔드 구현, 바이브코딩 프로젝트를 정리한 Choi의 포트폴리오입니다.';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/social/portfolio-og.png`;

const GENERIC_SUMMARIES = new Set([
    '포트폴리오',
    'portfolio',
    'blog',
    '블로그',
    'work',
    '바이브코딩',
    '바이브 코딩',
    'ui ux',
    'ui / ux',
    'contact page content',
    'about page content',
]);

const SERVER_LD_SCRIPT_IDS = [
    'project-structured-data',
    'project-server-structured-data',
    'listing-server-structured-data',
    'website-server-structured-data',
    'contact-server-structured-data',
];

const stripHtml = (value: string): string =>
    value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const truncate = (value: string, maxLength: number): string =>
    value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;

const isValidPublicImage = (value?: string | null): boolean => {
    const trimmed = String(value || '').trim();
    return Boolean(trimmed && !trimmed.startsWith('data:'));
};

const isWeakSummary = (value?: string | null): boolean => {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized.length < 15 || GENERIC_SUMMARIES.has(normalized);
};

const absoluteUrl = (value?: string): string => {
    if (!isValidPublicImage(value)) return DEFAULT_IMAGE;
    const trimmed = String(value).trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `${SITE_ORIGIN}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
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

const removeMeta = (selector: string) => {
    document.head.querySelector(selector)?.remove();
};

const clearRouteStructuredData = () => {
    SERVER_LD_SCRIPT_IDS.forEach((id) => document.getElementById(id)?.remove());
};

export const getProjectPath = (project: Project): string =>
    `/post/${encodeURIComponent(project.slug || project.id)}`;

export const getProjectSeo = (project: Project) => {
    const title = truncate(project.seoTitle || `${project.title} | ${SITE_NAME}`, 70);
    const bodyText = stripHtml(project.content || '');
    const rawDescription =
        (!isWeakSummary(project.seoDescription) ? project.seoDescription : '')
        || (!isWeakSummary(project.description) ? project.description : '')
        || (!isWeakSummary(project.subtitle) ? project.subtitle : '')
        || bodyText
        || project.seoDescription
        || project.description
        || project.subtitle
        || DEFAULT_DESCRIPTION;
    const description = truncate(String(rawDescription).trim(), 160);
    const url = `${SITE_ORIGIN}${getProjectPath(project)}`;
    const image = isValidPublicImage(project.seoImage)
        ? absoluteUrl(project.seoImage)
        : isValidPublicImage(project.imageUrl)
            ? absoluteUrl(project.imageUrl)
            : DEFAULT_IMAGE;
    const keywords = (project.seoKeywords && project.seoKeywords.length > 0 ? project.seoKeywords : project.tags || [])
        .filter(Boolean)
        .join(', ');

    return { title, description, url, image, keywords };
};

export const applyProjectSeo = (project: Project) => {
    const seo = getProjectSeo(project);
    const isBlogPost = project.type === 'blog';
    const publishedAt = String(project.date || '').slice(0, 10) || undefined;

    document.title = seo.title;
    setMeta('meta[name="description"]', 'content', seo.description);
    setMeta('meta[name="robots"]', 'content', project.noIndex ? 'noindex, nofollow' : 'index, follow');
    setMeta('link[rel="canonical"]', 'href', seo.url);
    setMeta('meta[property="og:type"]', 'content', isBlogPost ? 'article' : 'website');
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
    else removeMeta('meta[name="keywords"]');

    clearRouteStructuredData();
    const script = document.createElement('script');
    script.id = 'project-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': isBlogPost ? 'BlogPosting' : 'CreativeWork',
        headline: project.title,
        description: seo.description,
        image: seo.image,
        url: seo.url,
        datePublished: publishedAt,
        dateModified: publishedAt,
        author: {
            '@type': 'Person',
            name: project.author?.name || 'Choi'
        },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_ORIGIN
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': seo.url
        }
    });
    document.head.appendChild(script);
};

export interface PageSeoOptions {
    title: string;
    description: string;
    path: string;
    noIndex?: boolean;
}

/** Updates document metadata for non-post routes during client-side navigation. */
export const applyPageSeo = ({ title, description, path, noIndex = false }: PageSeoOptions) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${SITE_ORIGIN}${normalizedPath}`;

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[name="robots"]', 'content', noIndex ? 'noindex, nofollow' : 'index, follow');
    if (noIndex) {
        removeMeta('link[rel="canonical"]');
        removeMeta('meta[property="og:url"]');
    } else {
        setMeta('link[rel="canonical"]', 'href', url);
        setMeta('meta[property="og:url"]', 'content', url);
    }
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:image"]', 'content', DEFAULT_IMAGE);
    setMeta('meta[property="og:image:alt"]', 'content', 'Deepchoi portfolio preview image');
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', DEFAULT_IMAGE);
    removeMeta('meta[name="keywords"]');
    removeMeta('meta[property="article:published_time"]');
    clearRouteStructuredData();
};

export const applyDefaultSeo = () => {
    applyPageSeo({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        path: '/'
    });
};
