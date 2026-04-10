import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,

        login: async (email: string, password: string) => {
          const response = await api.login(email, password);
          localStorage.setItem('token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
          });
        },

        register: async (name: string, email: string, password: string) => {
          const response = await api.register(name, email, password);
          localStorage.setItem('token', response.token);
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
          });
        },

        logout: () => {
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        },

        initialize: () => {
          const token = localStorage.getItem('token');
          const { user } = get();
          
          if (token && user) {
            set({ isAuthenticated: true, isLoading: false, token });
          } else {
            set({ isLoading: false });
          }
        },

        updateUser: (userData: Partial<User>) => {
          const { user } = get();
          if (user) {
            set({ user: { ...user, ...userData } });
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user, token: state.token }),
      }
    ),
    { name: 'auth-store' }
  )
);
