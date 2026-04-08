import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  organization: {
    id: string;
    slug: string;
    name: string;
    plan: string;
  };
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token) => {
        set({ token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      fetchUser: async () => {
        try {
          const { data } = await api.get('/api/auth/me');
          set({ user: data, isAuthenticated: true });
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Initialize auth on app load
const token = useAuthStore.getState().token;
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
