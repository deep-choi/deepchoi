
import { User } from '../types';

const API_COMMENTS = '/api/comments';

export interface Comment {
    id: string;
    projectId: string;
    content: string;
    author: User;
    date: string;
}

export const commentService = {
    getComments: async (projectId: string): Promise<Comment[]> => {
        try {
            const res = await fetch(`${API_COMMENTS}/${projectId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error(err);
            return [];
        }
    },

    addComment: async (projectId: string, content: string, author: User): Promise<Comment | null> => {
        const newComment: Comment = {
            id: Date.now().toString(),
            projectId,
            content,
            author,
            date: new Date().toISOString()
        };
        try {
            const res = await fetch(API_COMMENTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newComment)
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    deleteComment: async (commentId: string): Promise<void> => {
        try {
            await fetch(`${API_COMMENTS}/${commentId}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error(err);
        }
    }
};
