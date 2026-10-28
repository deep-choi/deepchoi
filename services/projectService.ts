
import { Project } from '../types';
import { authService } from './authService';

const API_URL = '/api/projects';

const hasPinOrder = (project: Project): boolean =>
    project.pinOrder !== null && project.pinOrder !== undefined;

/** Admin-ordered entries first, then everything else newest first. */
const sortByNewest = (projects: Project[]): Project[] =>
    [...projects].sort((a, b) => {
        if (hasPinOrder(a) && hasPinOrder(b)) return Number(a.pinOrder) - Number(b.pinOrder);
        if (hasPinOrder(a) !== hasPinOrder(b)) return hasPinOrder(a) ? -1 : 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

const getStaticProjects = async (): Promise<Project[]> => {
    const { PROJECTS } = await import('../data/projects');
    return sortByNewest(PROJECTS);
};

export class ProjectServiceError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
        this.name = 'ProjectServiceError';
    }
}

const throwProjectResponseError = async (response: Response, fallbackMessage: string): Promise<never> => {
    let message = fallbackMessage;
    const responseText = await response.text().catch(() => '');

    if (responseText) {
        try {
            const payload = JSON.parse(responseText) as { error?: string };
            message = payload.error || responseText;
        } catch {
            message = responseText;
        }
    }

    if (response.status === 401) {
        authService.clearLocalSession();
        message = '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.';
    }

    throw new ProjectServiceError(message, response.status);
};

export const isProjectAuthenticationError = (error: unknown): boolean =>
    error instanceof ProjectServiceError && error.status === 401;

export const projectService = {
    getAllProjects: async (): Promise<Project[]> => {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch projects');
            const projects: Project[] = await res.json();
            return sortByNewest(projects);
        } catch (err) {
            console.error(err);
            return getStaticProjects();
        }
    },

    getProjectById: async (id: string): Promise<Project | undefined> => {
        try {
            const res = await fetch(`${API_URL}/${encodeURIComponent(id)}`);
            if (!res.ok) throw new Error('Failed to fetch project');
            return await res.json();
        } catch (err) {
            console.error(err);
            const projects = await getStaticProjects();
            return projects.find(project => project.id === id || project.slug === id);
        }
    },

    addProject: async (project: Project): Promise<boolean> => {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });
            if (!res.ok) {
                await throwProjectResponseError(res, 'Failed to add project');
            }
            return true;
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    updateProject: async (project: Project): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/${project.id}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });
            if (!res.ok) {
                await throwProjectResponseError(res, 'Failed to update project');
            }
            return res.ok;
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    /** Saves which entries sit at the top, in this order; all others fall back to date order. */
    saveTopOrder: async (ids: string[]): Promise<void> => {
        const res = await fetch(`${API_URL}/order`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (!res.ok) {
            await throwProjectResponseError(res, '상단 순서 저장에 실패했습니다.');
        }
    },

    deleteProject: async (id: string): Promise<boolean> => {
        console.log('[projectService.deleteProject] Called with id:', id);
        console.log('[projectService.deleteProject] Request URL:', `${API_URL}/${id}`);
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            console.log('[projectService.deleteProject] Response status:', res.status);
            console.log('[projectService.deleteProject] Response ok:', res.ok);
            if (!res.ok) {
                await throwProjectResponseError(res, 'Failed to delete project');
            }
            return true;
        } catch (err) {
            console.error('[projectService.deleteProject] Error:', err);
            if (err instanceof ProjectServiceError) throw err;
            return false;
        }
    }
};
