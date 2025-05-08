import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Application-wide state store
 * Replaces multiple context providers with a single state store
 */
interface AppState {
  // Viewport metrics
  viewport: {
    height: number
    width: number
    isMobile: boolean
  }
  // Performance and user preferences
  preferences: {
    reduceMotion: boolean
    performanceMode: 'low' | 'medium' | 'high'
    theme: 'light' | 'dark' | 'system'
  }
  // Overlay and modal state
  ui: {
    overlayVisible: boolean
    overlayContent: string | null
    sidebarOpen: boolean
  }
  // Actions
  actions: {
    // Viewport actions
    updateViewport: (metrics: Partial<AppState['viewport']>) => void
    // Preference actions
    setReduceMotion: (reduce: boolean) => void
    setPerformanceMode: (mode: AppState['preferences']['performanceMode']) => void
    setTheme: (theme: AppState['preferences']['theme']) => void
    // UI actions
    showOverlay: (content: string) => void
    hideOverlay: () => void
    toggleSidebar: (open?: boolean) => void
  }
}

/**
 * Main application state store
 * Uses persist middleware to save preferences to localStorage
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Default viewport state
      viewport: {
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
      },
      // Default user preferences
      preferences: {
        reduceMotion: typeof window !== 'undefined' 
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
          : false,
        performanceMode: 'medium',
        theme: 'system',
      },
      // Default UI state
      ui: {
        overlayVisible: false,
        overlayContent: null,
        sidebarOpen: false,
      },
      // Actions to update state
      actions: {
        // Viewport actions
        updateViewport: (metrics) => set((state) => ({
          viewport: { ...state.viewport, ...metrics },
        })),
        
        // Preference actions
        setReduceMotion: (reduce) => set((state) => ({
          preferences: { ...state.preferences, reduceMotion: reduce },
        })),
        
        setPerformanceMode: (mode) => set((state) => ({
          preferences: { ...state.preferences, performanceMode: mode },
        })),
        
        setTheme: (theme) => set((state) => ({
          preferences: { ...state.preferences, theme },
        })),
        
        // UI actions
        showOverlay: (content) => set({
          ui: {
            overlayVisible: true,
            overlayContent: content,
            sidebarOpen: false,
          },
        }),
        
        hideOverlay: () => set((state) => ({
          ui: { ...state.ui, overlayVisible: false, overlayContent: null },
        })),
        
        toggleSidebar: (open) => set((state) => ({
          ui: { 
            ...state.ui, 
            sidebarOpen: open !== undefined ? open : !state.ui.sidebarOpen,
          },
        })),
      },
    }),
    {
      name: 'ecotrack-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
)

/**
 * Helper hook to access only viewport-related state
 */
export const useViewport = () => {
  const viewport = useAppStore((state) => state.viewport)
  const updateViewport = useAppStore((state) => state.actions.updateViewport)
  
  return { ...viewport, updateViewport }
}

/**
 * Helper hook to access only preference-related state
 */
export const usePreferences = () => {
  const preferences = useAppStore((state) => state.preferences)
  const { setReduceMotion, setPerformanceMode, setTheme } = useAppStore((state) => state.actions)
  
  return { ...preferences, setReduceMotion, setPerformanceMode, setTheme }
}

/**
 * Helper hook to access only UI-related state
 */
export const useUI = () => {
  const ui = useAppStore((state) => state.ui)
  const { showOverlay, hideOverlay, toggleSidebar } = useAppStore((state) => state.actions)
  
  return { ...ui, showOverlay, hideOverlay, toggleSidebar }
}

export default useAppStore 