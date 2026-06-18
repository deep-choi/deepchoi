
import { User } from '../types';

const API_Auth = '/api/auth';

export const authService = {
    login: async (email: string, password: string): Promise<User | null> => {
        try {
            const res = await fetch(`${API_Auth}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) return null;
            const user: User = await res.json();
            localStorage.setItem('portfolio_user', JSON.stringify(user));
            return user;
        } catch (err) {
            console.error(err);
            return null;
        }
    },
    googleLogin: async (accessToken: string): Promise<User | null> => {
        try {
            const res = await fetch(`${API_Auth}/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken })
            });
            if (!res.ok) return null;
            const user: User = await res.json();
            localStorage.setItem('portfolio_user', JSON.stringify(user));
            return user;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    signup: async (name: string, email: string, password: string): Promise<User | null> => {
        try {
            const res = await fetch(`${API_Auth}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            if (!res.ok) return null;
            const user: User = await res.json();
            localStorage.setItem('portfolio_user', JSON.stringify(user));
            return user;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    logout: () => {
        localStorage.removeItem('portfolio_user');
    },

    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem('portfolio_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('portfolio_user');
    },

    isAdmin: (): boolean => {
        const user = authService.getCurrentUser();
        return user?.role === 'admin';
    }
};
