import { Project } from '../types';

export type ContentType = 'work' | 'blog';

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

const typeName = (type: string) => (type === 'blog' ? 'Blog' : 'Work');

/** Human-readable placement, e.g. "Blog AI · Work UI/UX" for cross-posted entries. */
export const placementSummary = (project: Partial<Project>, label: (name: string) => string = name => name): string => {
    const secondary = secondaryTypeOf(project);
    if (!secondary) return project.category || '';
    return `${typeName(primaryTypeOf(project))} ${label(project.category || '')} · ${typeName(secondary)} ${label(project.secondaryCategory || '')}`;
};

/** The entry's category within the given list. */
export const categoryIn = (project: Partial<Project>, type: ContentType): string =>
    secondaryTypeOf(project) === type ? (project.secondaryCategory || '') : (project.category || '');
