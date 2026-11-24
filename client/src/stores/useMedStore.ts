import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

interface MedStoreState {
  user: AuthUser | null;
  isAuthModalOpen: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useMedStore = create<MedStoreState>()(
  persist(
    (set) => ({
      user: null,
      isAuthModalOpen: false,
      setUser: (user) => set({ user, isAuthModalOpen: false }),
      logout: () => set({ user: null }),
      openAuthModal: () => set({ isAuthModalOpen: true }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
    }),
    {
      name: 'medhub-auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);