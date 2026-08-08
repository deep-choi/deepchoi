
import { User } from '../types';

const API_Auth = '/api/auth';
const USER_STORAGE_KEY = 'portfolio_user';
const OWNER_ANALYTICS_EXCLUDED_KEY = 'deepchoi_owner_analytics_excluded';

const readStoredUser = (): User | null => {
    try {
        const value = localStorage.getItem(USER_STORAGE_KEY);
        return value ? JSON.parse(value) as User : null;
    } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
    }
};

let currentUser = readStoredUser();
const authListeners = new Set<() => void>();

const notifyAuthListeners = () => {
    authListeners.forEach(listener => listener());
};

const persistUser = (user: User) => {
    currentUser = user;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    if (user.role === 'admin') {
        localStorage.setItem(OWNER_ANALYTICS_EXCLUDED_KEY, 'true');
    }
    notifyAuthListeners();
};

const clearPersistedUser = () => {
    currentUser = null;
    localStorage.removeItem(USER_STORAGE_KEY);
    notifyAuthListeners();
};

export const authService = {
    login: async (email: string, password: string): Promise<User | null> => {
        try {
            const res = await fetch(`${API_Auth}/login`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) return null;
            const user: User = await res.json();
            persistUser(user);
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
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken })
            });
            if (!res.ok) return null;
            const user: User = await res.json();
            persistUser(user);
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
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            if (!res.ok) return null;
            const user: User = await res.json();
            persistUser(user);
            return user;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    getSession: async (): Promise<User | null> => {
        try {
            const res = await fetch(`${API_Auth}/me`, { credentials: 'same-origin' });
            if (!res.ok) {
                clearPersistedUser();
                return null;
            }
            const user: User = await res.json();
            persistUser(user);
            return user;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    logout: async () => {
        try {
            await fetch(`${API_Auth}/logout`, { method: 'POST', credentials: 'same-origin' });
        } catch (err) {
            console.error(err);
        }
        clearPersistedUser();
    },

    getCurrentUser: (): User | null => {
        return currentUser;
    },

    isAuthenticated: (): boolean => {
        return currentUser !== null;
    },

    isAdmin: (): boolean => {
        const user = authService.getCurrentUser();
        return user?.role === 'admin';
    },

    isOwnerAnalyticsExcluded: (): boolean => {
        return localStorage.getItem(OWNER_ANALYTICS_EXCLUDED_KEY) === 'true';
    },

    clearLocalSession: () => {
        clearPersistedUser();
    },

    subscribe: (listener: () => void): (() => void) => {
        authListeners.add(listener);
        return () => authListeners.delete(listener);
    }
};
