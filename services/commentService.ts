
import { User } from '../types';

const API_COMMENTS = '/api/comments';

export interface Comment {
    id: string;
    projectId: string;
    content: string;
    author: User;
    date: string;
    status?: 'visible' | 'hidden';
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

    deleteComment: async (commentId: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_COMMENTS}/delete/${encodeURIComponent(commentId)}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to delete comment');
            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    },

    updateComment: async (commentId: string, content: string): Promise<Comment | null> => {
        try {
            const res = await fetch(`${API_COMMENTS}/edit/${encodeURIComponent(commentId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to update comment');
            }
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    updateCommentStatus: async (commentId: string, status: 'visible' | 'hidden'): Promise<boolean> => {
        try {
            const res = await fetch(`${API_COMMENTS}/status/${encodeURIComponent(commentId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to update comment status');
            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
};
