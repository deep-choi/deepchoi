import type { Project } from '../types';
import type { CategoryRecord } from '../services/categoryService';

export type ContentType = 'work' | 'blog';
export type EditorPlacement = ContentType | 'news';
type PlacementCategory = Pick<CategoryRecord, 'name' | 'type' | 'section'>;

export const placementLabel = (placement: EditorPlacement) =>
    placement === 'news' ? '뉴스' : placement === 'blog' ? 'Blog' : 'Work';

export const categoriesForPlacement = <T extends PlacementCategory>(categories: T[], placement: EditorPlacement): T[] =>
    categories.filter(category => placement === 'work'
        ? category.type === 'work'
        : category.type === 'blog' && (category.section === 'news') === (placement === 'news'));

export const placementForCategory = (type: ContentType, category: string | undefined, categories: PlacementCategory[]): EditorPlacement =>
    type === 'work' ? 'work' : categories.some(item => item.type === 'blog' && item.name === category && item.section === 'news') ? 'news' : 'blog';

export const primaryPlacementOf = (project: Partial<Project>, categories: PlacementCategory[]): EditorPlacement =>
    placementForCategory(project.type === 'blog' ? 'blog' : 'work', project.category, categories);

/** Blog and News share a stored type, with distinct category sections. Work may accompany either. */
export const toggleEditorPlacement = (project: Partial<Project>, target: EditorPlacement, categories: PlacementCategory[]): Partial<Project> => {
    const primary = primaryPlacementOf(project, categories);
    const secondaryType = secondaryTypeOf(project);
    const secondary = secondaryType ? placementForCategory(secondaryType, project.secondaryCategory || '', categories) : null;
    if (target === secondary) return { ...project, secondaryType: null, secondaryCategory: null };
    if (target === primary) return secondaryType
        ? { ...project, type: secondaryType, category: project.secondaryCategory || '', secondaryType: null, secondaryCategory: null }
        : project;
    const category = categoriesForPlacement(categories, target)[0]?.name;
    if (!category) return project;
    const type: ContentType = target === 'work' ? 'work' : 'blog';
    if (type === (project.type === 'blog' ? 'blog' : 'work')) return { ...project, category };
    return { ...project, secondaryType: type, secondaryCategory: category };
};

/** The entry's main type; entries saved before types existed count as Work. */
export const primaryTypeOf = (project: Partial<Project>): 'work' | 'blog' | 'page' =>
    project.type === 'blog' || project.type === 'page' ? project.type : 'work';

/** The other list the entry is also shown in, if any. */
export const secondaryTypeOf = (project: Partial<Project>): ContentType | null => {
    const primary = primaryTypeOf(project);
    const secondary = project.secondaryType;
    if (primary === 'page' || (secondary !== 'work' && secondary !== 'blog') || secondary === primary) return null;
    return secondary;
};

/** Whether the entry appears in the Work or Blog list. */
export const isListedIn = (project: Partial<Project>, type: ContentType): boolean =>
    primaryTypeOf(project) === type || secondaryTypeOf(project) === type;

/** Human-readable placement, e.g. "Blog AI · Work UI/UX" for cross-posted entries. */
export const placementSummary = (project: Partial<Project>, label: (name: string) => string = name => name, categories: PlacementCategory[] = []): string => {
    const secondary = secondaryTypeOf(project);
    const primary = primaryPlacementOf(project, categories);
    if (!secondary) return primary === 'news' ? `뉴스 ${label(project.category || '')}` : project.category || '';
    const other = placementForCategory(secondary, project.secondaryCategory || '', categories);
    return `${placementLabel(primary)} ${label(project.category || '')} · ${placementLabel(other)} ${label(project.secondaryCategory || '')}`;
};

/** The entry's category within the given list. */
export const categoryIn = (project: Partial<Project>, type: ContentType): string =>
    secondaryTypeOf(project) === type ? (project.secondaryCategory || '') : (project.category || '');
