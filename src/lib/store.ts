import { create } from 'zustand'

export type ViewId = 
  | 'dashboard'
  | 'users'
  | 'nas'
  | 'plans'
  | 'policies'
  | 'sessions'
  | 'billing'
  | 'reports'
  | 'dictionary'
  | 'settings'

interface AppState {
  activeView: ViewId
  sidebarOpen: boolean
  setActiveView: (view: ViewId) => void
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  sidebarOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
