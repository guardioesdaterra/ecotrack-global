import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  vh: number;
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  actions: {
    updateVh: (height: number) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
  };
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        vh: typeof window !== 'undefined' ? window.innerHeight * 0.01 : 0,
        theme: 'system',
        sidebarOpen: false,
        actions: {
          updateVh: (height) => set({ vh: height }),
          setTheme: (theme) => set({ theme }),
          toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
          setSidebarOpen: (open) => set({ sidebarOpen: open }),
        },
      }),
      {
        name: 'ecotrack-app-storage',
        partialize: (state) => ({ theme: state.theme }),
      }
    )
  )
);

// Helper functions to avoid directly using the store's actions
export const updateViewportHeight = (height: number) => {
  useAppStore.getState().actions.updateVh(height);
};

export const setAppTheme = (theme: 'light' | 'dark' | 'system') => {
  useAppStore.getState().actions.setTheme(theme);
};

export const toggleSidebar = () => {
  useAppStore.getState().actions.toggleSidebar();
};

export const setSidebarOpen = (open: boolean) => {
  useAppStore.getState().actions.setSidebarOpen(open);
}; 