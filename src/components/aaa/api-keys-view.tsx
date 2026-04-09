'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Key,
  Plus,
  Search,
  Trash2,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Gauge,
  Activity,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Zap,
  KeyRound,
  Ban,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
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

interface ApiKeyItem {
  id: string
  name: string
  keyHash: string
  keyPrefix: string
  adminId: string
  permissions: string
  rateLimit: number
  lastUsedAt: string | null
  expiresAt: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface ApiKeyStats {
  total: number
  active: number
  requestsToday: number
  avgRateLimit: number
}

interface CreateKeyFormData {
  name: string
  permissions: string[]
  rateLimit: string
  expiresAt: string
}

const emptyCreateForm: CreateKeyFormData = {
  name: '',
  permissions: ['read'],
  rateLimit: '1000',
  expiresAt: '',
}

const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Read', description: 'View data and resources', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' },
  { value: 'write', label: 'Write', description: 'Create and modify resources', color: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access', color: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400' },
]

function parsePermissions(permStr: string): string[] {
  return permStr.split(',').map((s) => s.trim()).filter(Boolean)
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return 'Unknown'
  }
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function StatusBadge({ status, expiresAt }: { status: string; expiresAt: string | null }) {
  if (status === 'revoked') {
    return (
      <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400">
        <Ban className="h-3 w-3 mr-1" />
        Revoked
      </Badge>
    )
  }
  if (isExpired(expiresAt)) {
    return (
      <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400">
        <Clock className="h-3 w-3 mr-1" />
        Expired
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
      Active
    </Badge>
  )
}

function PermissionBadge({ permission }: { permission: string }) {
  const config: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    read: { cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400', icon: Eye, label: 'Read' },
    write: { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400', icon: KeyRound, label: 'Write' },
    admin: { cls: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400', icon: ShieldAlert, label: 'Admin' },
  }
  const c = config[permission] || config.read
  const Icon = c.icon
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0 gap-0.5', c.cls)}>
      <Icon className="h-2.5 w-2.5" />
      {c.label}
    </Badge>
  )
}

// ==========================================
// KEY REVEAL COMPONENT (shown ONCE on creation)
// ==========================================

function NewKeyReveal({ apiKey, plainKey, onClose }: { apiKey: string; plainKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(plainKey)
    setCopied(true)
    toast.success('API key copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/25">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">Save this API key now!</p>
          <p className="text-amber-600/80 dark:text-amber-400/80 text-xs mt-0.5">
            For security reasons, this is the <strong>only time</strong> you will be able to see the full key. Make sure to copy it to a safe place.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Key Name</Label>
        <p className="text-sm font-medium">{apiKey}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">API Key</Label>
        <div className="flex gap-2">
          <code className="flex-1 text-xs font-mono bg-muted/60 border border-border/40 rounded-md p-3 break-all select-all">
            {plainKey}
          </code>
          <Button
            variant={copied ? 'default' : 'outline'}
            size="icon"
            className="shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Separator />
      <DialogFooter>
        <Button onClick={onClose}>
          <Check className="h-4 w-4 mr-2" />
          I&apos;ve saved my key
        </Button>
      </DialogFooter>
    </div>
  )
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function ApiKeysView() {
  const queryClient = useQueryClient()

  // UI State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKeyItem | null>(null)
  const [formData, setFormData] = useState<CreateKeyFormData>(emptyCreateForm)

  // New key reveal state
  const [newKeyName, setNewKeyName] = useState('')
  const [newPlainKey, setNewPlainKey] = useState('')
  const [showKeyReveal, setShowKeyReveal] = useState(false)

  // ==========================================
  // QUERIES
  // ==========================================

  const { data, isLoading, isError } = useQuery<{
    apiKeys: ApiKeyItem[]
    pagination: { page: number; limit: number; total: number; pages: number }
    stats: ApiKeyStats
  }>({
    queryKey: ['api-keys', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '50')
      const res = await fetch(`/api/api-keys?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch API keys')
      return res.json()
    },
    staleTime: 30000,
  })

  const stats = data?.stats

  // ==========================================
  // MUTATIONS
  // ==========================================

  const createMutation = useMutation({
    mutationFn: async (data: CreateKeyFormData) => {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create API key')
      }
      return res.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setNewKeyName(result.apiKey.name)
      setNewPlainKey(result.plainKey)
      setShowKeyReveal(true)
      setFormData(emptyCreateForm)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to revoke API key')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('API key revoked and deleted')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setDeleteDialogOpen(false)
      setSelectedKey(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.permissions.length === 0) {
      toast.error('Select at least one permission')
      return
    }
    createMutation.mutate(formData)
  }

  const handleTogglePermission = (perm: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  const handleCloseKeyReveal = () => {
    setShowKeyReveal(false)
    setNewPlainKey('')
    setNewKeyName('')
    setCreateDialogOpen(false)
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={() => { setFormData(emptyCreateForm); setShowKeyReveal(false); setCreateDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Stats Row */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold stat-number">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Keys</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
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
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-violet-500/10">
                    <Activity className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-600 stat-number">{stats.requestsToday}</p>
                    <p className="text-xs text-muted-foreground">Requests Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-teal-500/10">
                    <Gauge className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold stat-number">{stats.avgRateLimit}</p>
                    <p className="text-xs text-muted-foreground">Avg Rate Limit</p>
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
                  placeholder="Search by name or key prefix..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="h-9 w-full sm:w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <Card className="border shadow-sm">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
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
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">Failed to load API keys</h3>
              <p className="text-sm text-muted-foreground mb-4">There was an error fetching API keys.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['api-keys'] })}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.apiKeys.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No API keys found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || statusFilter ? 'Try adjusting your filters.' : 'Create your first API key to authenticate external integrations.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(search || statusFilter) && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('') }}>
                    Clear Filters
                  </Button>
                )}
                <Button size="sm" onClick={() => { setFormData(emptyCreateForm); setShowKeyReveal(false); setCreateDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
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
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Key Prefix</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Permissions</th>
                    <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">Rate Limit</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Last Used</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Expires</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.apiKeys.map((k) => {
                    const permissions = parsePermissions(k.permissions)
                    return (
                      <tr key={k.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                              <Key className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{k.name}</p>
                              <p className="text-[11px] text-muted-foreground sm:hidden font-mono">{k.keyPrefix}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <code className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">{k.keyPrefix}</code>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {permissions.map((p) => (
                              <PermissionBadge key={p} permission={p} />
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{k.rateLimit.toLocaleString()}/min</span>
                        </td>
                        <td className="p-3 hidden xl:table-cell">
                          <span className="text-xs text-muted-foreground">{formatRelativeDate(k.lastUsedAt)}</span>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className={cn('text-xs', isExpired(k.expiresAt) && k.status === 'active' ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                            {formatExpiry(k.expiresAt)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={k.status} expiresAt={k.expiresAt} />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-8 w-8',
                                    k.status !== 'revoked' ? 'text-destructive hover:text-destructive' : 'text-muted-foreground'
                                  )}
                                  disabled={k.status === 'revoked'}
                                  onClick={() => { setSelectedKey(k); setDeleteDialogOpen(true) }}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{k.status === 'revoked' ? 'Already Revoked' : 'Revoke Key'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => { setSelectedKey(k); setDeleteDialogOpen(true) }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

        {/* Create API Key Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => !open && !showKeyReveal && setCreateDialogOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => showKeyReveal && e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Create API Key
              </DialogTitle>
              {!showKeyReveal && (
                <DialogDescription>
                  Generate a new API key for external integrations and programmatic access.
                </DialogDescription>
              )}
            </DialogHeader>

            {showKeyReveal ? (
              <NewKeyReveal apiKey={newKeyName} plainKey={newPlainKey} onClose={handleCloseKeyReveal} />
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Billing Integration"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key-rate">Rate Limit (requests/min)</Label>
                  <Input
                    id="key-rate"
                    type="number"
                    min={1}
                    max={100000}
                    placeholder="1000"
                    value={formData.rateLimit}
                    onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Maximum number of API requests allowed per minute.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key-expiry">Expiry Date (optional)</Label>
                  <Input
                    id="key-expiry"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for a key that never expires.</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <p className="text-xs text-muted-foreground">Define the access level for this API key.</p>
                  <div className="space-y-2">
                    {PERMISSION_OPTIONS.map((opt) => (
                      <div
                        key={opt.value}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          formData.permissions.includes(opt.value)
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/40 hover:bg-muted/30'
                        )}
                        onClick={() => handleTogglePermission(opt.value)}
                      >
                        <Checkbox
                          checked={formData.permissions.includes(opt.value)}
                          onCheckedChange={() => handleTogglePermission(opt.value)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0', opt.color)}>
                          {opt.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Key
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete / Revoke Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                Revoke API Key
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently revoke and delete API key{' '}
                <strong className="font-mono text-xs">{selectedKey?.name}</strong>?{' '}
                Any applications using this key will immediately lose access. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedKey && deleteMutation.mutate(selectedKey.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Revoke & Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
