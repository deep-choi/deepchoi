import { useSyncExternalStore } from 'react';
import { authService } from '../services/authService';

export const useAuthUser = () => useSyncExternalStore(
    authService.subscribe,
    authService.getCurrentUser,
    () => null
);
