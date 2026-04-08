'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ShieldCheck,
  Plus,
  Search,
  Trash2,
  Pencil,
  Lock,
  Unlock,
  Ban,
  Check,
  X,
  Loader2,
  UserCircle,
  ShieldAlert,
  Users,
  Shield,
  Eye,
  Activity,
  Clock,
  MoreVertical,
  Mail,
  Phone,
  User,
  AlertTriangle,
  Monitor,
  Globe,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ==========================================
// TYPES
// ==========================================

interface AdminItem {
  id: string
  username: string
  fullName: string | null
  email: string
  phone: string | null
  role: string
  status: string
  twoFactorEnabled: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
  loginAttempts: number
  lockedUntil: string | null
  passwordChangedAt: string | null
  avatar: string | null
  createdAt: string
  updatedAt: string
}

interface AdminStats {
  total: number
  active: number
  locked: number
  twoFAEnabled: number
}

interface LoginAttempt {
  id: string
  username: string
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  failReason: string | null
  timestamp: string
}

interface CreateFormData {
  username: string
  password: string
  fullName: string
  email: string
  phone: string
  role: string
}

interface EditFormData {
  fullName: string
  email: string
  phone: string
  role: string
  status: string
}

const emptyCreateForm: CreateFormData = {
  username: '',
  password: '',
  fullName: '',
  email: '',
  phone: '',
  role: 'operator',
}

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access with all privileges' },
  { value: 'admin', label: 'Admin', description: 'Administrative access with management capabilities' },
  { value: 'operator', label: 'Operator', description: 'Operational access for daily tasks' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access for monitoring' },
]

// ==========================================
// HELPERS
// ==========================================

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return '—'
  }
}

// ==========================================
// ROLE BADGE
// ==========================================

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    super_admin: {
      cls: 'bg-rose-500/15 text-rose-600 border-rose-500/25 dark:text-rose-400',
      icon: ShieldAlert,
      label: 'Super Admin',
    },
    admin: {
      cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
      icon: ShieldCheck,
      label: 'Admin',
    },
    operator: {
      cls: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400',
      icon: Shield,
      label: 'Operator',
    },
    viewer: {
      cls: 'bg-slate-500/15 text-slate-600 border-slate-500/25 dark:text-slate-400',
      icon: Eye,
      label: 'Viewer',
    },
  }
  const c = config[role] || config.viewer
  const Icon = c.icon
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 gap-1', c.cls)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  )
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    active: {
      cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
      icon: CheckCircle2,
      label: 'Active',
    },
    disabled: {
      cls: 'bg-slate-500/15 text-slate-500 border-slate-500/25 dark:text-slate-400',
      icon: XCircle,
      label: 'Disabled',
    },
    locked: {
      cls: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400',
      icon: Lock,
      label: 'Locked',
    },
  }
  const c = config[status] || config.disabled
  const Icon = c.icon
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 gap-1', c.cls)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  )
}

// ==========================================
// 2FA BADGE
// ==========================================

function TwoFaBadge({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0.5 gap-1 text-muted-foreground border-muted">
            <X className="h-2.5 w-2.5" />
            2FA Off
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Two-factor authentication is disabled</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0.5 gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400">
          <Check className="h-2.5 w-2.5" />
          2FA
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Two-factor authentication is enabled</TooltipContent>
    </Tooltip>
  )
}

// ==========================================
// LOGIN ATTEMPTS PANEL
// ==========================================

function LoginAttemptsPanel() {
  const { data, isLoading } = useQuery<{
    loginAttempts: LoginAttempt[]
    stats: { total: number; successful: number; failed: number; recentFailed24h: number }
  }>({
    queryKey: ['admin-login-attempts'],
    queryFn: async () => {
      const res = await fetch('/api/admins/login-attempts?limit=20')
      if (!res.ok) throw new Error('Failed to fetch login attempts')
      return res.json()
    },
    staleTime: 30000,
  })

  return (
    <Card className="border shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recent Login Activity</h3>
        </div>
        {data?.stats && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              {data.stats.successful} success
            </Badge>
            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400">
              <XCircle className="h-2.5 w-2.5 mr-1" />
              {data.stats.failed} failed
            </Badge>
          </div>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        ) : !data?.loginAttempts?.length ? (
          <div className="p-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No login attempts recorded</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Username</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs hidden md:table-cell">IP Address</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Reason</th>
                <th className="text-right p-3 font-medium text-muted-foreground text-xs">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.loginAttempts.map((attempt) => (
                <tr key={attempt.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    {attempt.success ? (
                      <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400">
                        <XCircle className="h-2.5 w-2.5 mr-0.5" />
                        Fail
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-xs">{attempt.username}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground font-mono">{attempt.ipAddress || '—'}</span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{attempt.failReason || '—'}</span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-[11px] text-muted-foreground">{formatRelativeDate(attempt.timestamp)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function AdminView() {
  const queryClient = useQueryClient()

  // UI State
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminItem | null>(null)
  const [createForm, setCreateForm] = useState<CreateFormData>(emptyCreateForm)
  const [editForm, setEditForm] = useState<EditFormData>({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    status: '',
  })

  // ==========================================
  // QUERIES
  // ==========================================

  const { data, isLoading, isError } = useQuery<{
    admins: AdminItem[]
    pagination: { page: number; limit: number; total: number; pages: number }
    stats: AdminStats
  }>({
    queryKey: ['admins', search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '50')
      const res = await fetch(`/api/admins?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch admins')
      return res.json()
    },
    staleTime: 30000,
  })

  const stats = data?.stats

  // ==========================================
  // MUTATIONS
  // ==========================================

  const createMutation = useMutation({
    mutationFn: async (formData: CreateFormData) => {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create admin')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Admin account created successfully')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      setCreateForm(emptyCreateForm)
      setCreateDialogOpen(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditFormData }) => {
      const res = await fetch(`/api/admins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update admin')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Admin updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      setEditDialogOpen(false)
      setSelectedAdmin(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admins/${id}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update status')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      const statusLabels: Record<string, string> = {
        active: 'enabled',
        disabled: 'disabled',
        locked: 'locked',
      }
      toast.success(`Admin ${statusLabels[variables.status] || 'updated'} successfully`)
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete admin')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Admin deleted permanently')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      setDeleteDialogOpen(false)
      setSelectedAdmin(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.username || !createForm.password || !createForm.email) {
      toast.error('Username, password, and email are required')
      return
    }
    createMutation.mutate(createForm)
  }

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAdmin) return
    updateMutation.mutate({ id: selectedAdmin.id, data: editForm })
  }

  const openEditDialog = (admin: AdminItem) => {
    setSelectedAdmin(admin)
    setEditForm({
      fullName: admin.fullName || '',
      email: admin.email || '',
      phone: admin.phone || '',
      role: admin.role,
      status: admin.status,
    })
    setEditDialogOpen(true)
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Admin & RBAC Management
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage administrator accounts, roles, and access control policies
            </p>
          </div>
          <Button size="sm" onClick={() => { setCreateForm(emptyCreateForm); setCreateDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
        </div>

        {/* Stats Row */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold stat-number">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600 stat-number">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-500/10">
                    <Lock className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600 stat-number">{stats.locked}</p>
                    <p className="text-xs text-muted-foreground">Locked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-500/10">
                    <ShieldCheck className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-600 stat-number">{stats.twoFAEnabled}</p>
                    <p className="text-xs text-muted-foreground">2FA Enabled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-7 w-12" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filter Bar */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, name, or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter || 'all'} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="h-9 w-full sm:w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="h-9 w-full sm:w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Table */}
        {isLoading ? (
          <Card className="border shadow-sm">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <div className="ml-auto flex gap-2">
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : isError ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">Failed to load admins</h3>
              <p className="text-sm text-muted-foreground mb-4">There was an error fetching admin accounts.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admins'] })}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.admins.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No admin accounts found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || roleFilter || statusFilter ? 'Try adjusting your filters.' : 'Create your first admin account to get started.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(search || roleFilter || statusFilter) && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}>
                    Clear Filters
                  </Button>
                )}
                <Button size="sm" onClick={() => { setCreateForm(emptyCreateForm); setCreateDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Admin</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-center p-3 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Last Login</th>
                    <th className="text-center p-3 font-medium text-muted-foreground hidden xl:table-cell">2FA</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.admins.map((admin) => (
                    <tr key={admin.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{admin.fullName || admin.username}</p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate">@{admin.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{admin.email}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <RoleBadge role={admin.role} />
                      </td>
                      <td className="p-3 text-center hidden md:table-cell">
                        <StatusBadge status={admin.status} />
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeDate(admin.lastLoginAt)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center hidden xl:table-cell">
                        <TwoFaBadge enabled={admin.twoFactorEnabled} />
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEditDialog(admin)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Admin
                            </DropdownMenuItem>
                            {admin.status === 'active' ? (
                              <>
                                <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ id: admin.id, status: 'disabled' })}>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Disable
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ id: admin.id, status: 'locked' })} className="text-red-600 dark:text-red-400">
                                  <Lock className="h-4 w-4 mr-2" />
                                  Lock Account
                                </DropdownMenuItem>
                              </>
                            ) : admin.status === 'locked' ? (
                              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ id: admin.id, status: 'active' })} className="text-emerald-600 dark:text-emerald-400">
                                <Unlock className="h-4 w-4 mr-2" />
                                Unlock Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ id: admin.id, status: 'active' })} className="text-emerald-600 dark:text-emerald-400">
                                <Unlock className="h-4 w-4 mr-2" />
                                Enable Account
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelectedAdmin(admin); setDeleteDialogOpen(true) }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              Page {data.pagination.page} of {data.pagination.pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}

        {/* Login Attempts Panel */}
        <LoginAttemptsPanel />

        {/* Create Admin Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Create Admin Account
              </DialogTitle>
              <DialogDescription>
                Add a new administrator to the system. They will receive an active account immediately.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-username">Username <span className="text-destructive">*</span></Label>
                  <Input
                    id="create-username"
                    placeholder="johndoe"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.trim().toLowerCase() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Password <span className="text-destructive">*</span></Label>
                  <Input
                    id="create-password"
                    type="password"
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-fullname">Full Name</Label>
                  <Input
                    id="create-fullname"
                    placeholder="John Doe"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    placeholder="+1 234 567 890"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="john@company.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value.trim().toLowerCase() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Admin
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit Admin — @{selectedAdmin?.username}
              </DialogTitle>
              <DialogDescription>
                Update admin profile information, role, and status.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fullname">Full Name</Label>
                  <Input
                    id="edit-fullname"
                    placeholder="John Doe"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    placeholder="+1 234 567 890"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@company.com"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value.trim().toLowerCase() })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedAdmin && (
                <div className="rounded-lg border border-muted bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Account Information</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>Username:</span>
                      <span className="font-mono font-medium text-foreground">@{selectedAdmin.username}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last Login:</span>
                      <span className="font-medium text-foreground">{formatRelativeDate(selectedAdmin.lastLoginAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      <span>Login Attempts:</span>
                      <span className={cn('font-medium', selectedAdmin.loginAttempts > 3 ? 'text-red-600' : 'text-foreground')}>
                        {selectedAdmin.loginAttempts}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>Last IP:</span>
                      <span className="font-mono font-medium text-foreground">{selectedAdmin.lastLoginIp || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Admin Account
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete admin{' '}
                <strong className="font-semibold">{selectedAdmin?.fullName || `@${selectedAdmin?.username}`}</strong>?{' '}
                This will remove all associated data including API keys and ticket assignments.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedAdmin && deleteMutation.mutate(selectedAdmin.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
