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
  | 'ip-pools'
  | 'registrations'
  | 'selfcare'
  | 'login'

interface AppState {
  activeView: ViewId
  sidebarOpen: boolean
  isAuthenticated: boolean
  user: { username: string; role: string } | null
  setActiveView: (view: ViewId) => void
  setSidebarOpen: (open: boolean) => void
  setAuthenticated: (value: boolean) => void
  setUser: (user: { username: string; role: string } | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  sidebarOpen: true,
  isAuthenticated: false,
  user: null,
  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setUser: (user) => set({ user }),
}))
