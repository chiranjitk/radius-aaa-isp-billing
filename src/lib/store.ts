import { create } from 'zustand'

export type UserRole = 'admin' | 'operator' | 'viewer'

export type ViewId = 
  | 'dashboard'
  | 'activity'
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
  | 'topology'
  | 'bandwidth'
  | 'tickets'
  | 'hotspot'
  | 'vouchers'
  | 'resellers'
  | 'notifications'
  | 'webhooks'
  | 'api-keys'
  | 'tax'
  | 'wallet'
  | 'coupons'
  | 'billing-engine'
  | 'admin'
  | 'login'

// Permission definitions per role
type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'disconnect' | 'export'

const rolePermissions: Record<UserRole, Record<string, PermissionAction[]>> = {
  admin: {
    dashboard: ['view'],
    activity: ['view'],
    users: ['view', 'create', 'edit', 'delete'],
    nas: ['view', 'create', 'edit', 'delete'],
    policies: ['view', 'create', 'edit', 'delete'],
    sessions: ['view', 'disconnect'],
    plans: ['view', 'create', 'edit', 'delete'],
    billing: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'export'],
    dictionary: ['view'],
    settings: ['view', 'edit'],
    'ip-pools': ['view', 'create', 'edit', 'delete'],
    registrations: ['view', 'create', 'edit', 'delete'],
    tickets: ['view', 'create', 'edit', 'delete'],
    resellers: ['view', 'create', 'edit', 'delete'],
    notifications: ['view', 'create', 'edit', 'delete'],
    webhooks: ['view', 'create', 'edit', 'delete'],
    'api-keys': ['view', 'create', 'edit', 'delete'],
    hotspot: ['view', 'create', 'edit', 'delete'],
    vouchers: ['view', 'create', 'edit', 'delete'],
    tax: ['view', 'create', 'edit', 'delete'],
    wallet: ['view', 'create', 'edit'],
    coupons: ['view', 'create', 'edit', 'delete'],
    'billing-engine': ['view', 'create', 'edit', 'delete'],
    admin: ['view', 'create', 'edit', 'delete'],
    selfcare: ['view'],
    topology: ['view'],
  },
  operator: {
    dashboard: ['view'],
    activity: ['view'],
    users: ['view', 'create', 'edit'],
    nas: ['view'],
    policies: ['view'],
    sessions: ['view', 'disconnect'],
    plans: ['view'],
    billing: ['view', 'create'],
    reports: ['view'],
    dictionary: ['view'],
    settings: ['view'],
    'ip-pools': ['view'],
    registrations: ['view'],
    tickets: ['view', 'create'],
    resellers: ['view'],
    notifications: ['view'],
    webhooks: ['view'],
    'api-keys': ['view'],
    hotspot: ['view', 'create', 'edit'],
    vouchers: ['view', 'create', 'edit'],
    tax: ['view'],
    wallet: ['view'],
    coupons: ['view'],
    'billing-engine': ['view'],
    admin: ['view'],
    selfcare: ['view'],
    topology: ['view'],
  },
  viewer: {
    dashboard: ['view'],
    activity: ['view'],
    users: ['view'],
    nas: ['view'],
    policies: ['view'],
    sessions: ['view'],
    plans: ['view'],
    billing: ['view'],
    reports: ['view'],
    dictionary: ['view'],
    settings: ['view'],
    'ip-pools': ['view'],
    registrations: ['view'],
    tickets: ['view'],
    resellers: ['view'],
    notifications: ['view'],
    webhooks: ['view'],
    'api-keys': ['view'],
    hotspot: ['view'],
    vouchers: ['view'],
    tax: ['view'],
    wallet: ['view'],
    coupons: ['view'],
    'billing-engine': ['view'],
    admin: ['view'],
    selfcare: ['view'],
    topology: ['view'],
  },
}

function checkPermission(role: UserRole, module: string, action: PermissionAction): boolean {
  const modulePerms = rolePermissions[role]?.[module]
  if (!modulePerms) return false
  return modulePerms.includes(action)
}

interface AppState {
  activeView: ViewId
  sidebarOpen: boolean
  isAuthenticated: boolean
  user: { username: string; role: UserRole } | null
  activeRole: UserRole
  setActiveView: (view: ViewId) => void
  setSidebarOpen: (open: boolean) => void
  setAuthenticated: (value: boolean) => void
  setUser: (user: { username: string; role: UserRole } | null) => void
  setActiveRole: (role: UserRole) => void
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'disconnect' | 'export') => boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: 'dashboard',
  sidebarOpen: true,
  isAuthenticated: false,
  user: null,
  activeRole: 'admin',
  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setUser: (user) => set({ user, activeRole: user?.role ?? 'viewer' }),
  setActiveRole: (role) => set({ activeRole: role }),
  hasPermission: (module, action) => {
    const role = get().activeRole
    return checkPermission(role, module, action)
  },
}))
