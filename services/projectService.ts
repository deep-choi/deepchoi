
import { Project } from '../types';

const API_URL = '/api/projects';

const sortByNewest = (projects: Project[]): Project[] =>
    [...projects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const getStaticProjects = async (): Promise<Project[]> => {
    const { PROJECTS } = await import('../data/projects');
    return sortByNewest(PROJECTS);
};

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
            const res = await fetch(`${API_URL}/${id}`);
            if (!res.ok) throw new Error('Failed to fetch project');
            return await res.json();
        } catch (err) {
            console.error(err);
            const projects = await getStaticProjects();
            return projects.find(project => project.id === id);
        }
    },

    addProject: async (project: Project): Promise<boolean> => {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to add project');
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to update project');
            }
            return res.ok;
        } catch (err) {
            console.error(err);
            throw err;
        }
    },

    deleteProject: async (id: string): Promise<boolean> => {
        console.log('[projectService.deleteProject] Called with id:', id);
        console.log('[projectService.deleteProject] Request URL:', `${API_URL}/${id}`);
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            console.log('[projectService.deleteProject] Response status:', res.status);
            console.log('[projectService.deleteProject] Response ok:', res.ok);
            return res.ok;
        } catch (err) {
            console.error('[projectService.deleteProject] Error:', err);
            return false;
        }
    }
};
