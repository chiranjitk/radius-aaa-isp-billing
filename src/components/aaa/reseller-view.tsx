'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Building2,
  Edit,
  Trash2,
  Eye,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ChevronRight,
  Shield,
  Copy,
  Crown,
  MoreHorizontal,
  CircleDollarSign,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ─── Types ───────────────────────────────────────────────────────────
interface Reseller {
  id: string
  username: string
  password: string
  fullName: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  balance: number
  commissionRate: number
  creditLimit: number
  parentId: string | null
  level: number
  status: string
  logoUrl: string | null
  primaryColor: string | null
  customDomain: string | null
  customEmail: string | null
  maxUsers: number | null
  maxNas: number | null
  ipPoolIds: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  _count: { commissions: number; transactions: number }
}

interface Commission {
  id: string
  resellerId: string
  username: string
  invoiceId: string | null
  amount: number
  rate: number
  status: string
  paidAt: string | null
  createdAt: string
}

interface Transaction {
  id: string
  resellerId: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  referenceId: string | null
  performedBy: string | null
  createdAt: string
}

interface ResellersResponse {
  resellers: Reseller[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  stats: { total: number; active: number; totalCommissionPaid: number; totalRevenue: number }
}

// ─── Status Config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  active: { label: 'Active', variant: 'default', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' },
  disabled: { label: 'Disabled', variant: 'destructive', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25' },
  suspended: { label: 'Suspended', variant: 'secondary', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' },
}

const LEVEL_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Level 1 - Master', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950' },
  2: { label: 'Level 2 - Distributor', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950' },
  3: { label: 'Level 3 - Sub-Distributor', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-950' },
  4: { label: 'Level 4 - Agent', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950' },
}

const TX_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  topup: { label: 'Topup', color: 'text-emerald-600', icon: ArrowDownLeft },
  deduction: { label: 'Deduction', color: 'text-red-600', icon: ArrowUpRight },
  commission: { label: 'Commission', color: 'text-amber-600', icon: CircleDollarSign },
  adjustment: { label: 'Adjustment', color: 'text-violet-600', icon: RefreshCw },
}

// ─── Default Form ────────────────────────────────────────────────────
function getDefaultForm() {
  return {
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    country: '',
    balance: '0',
    commissionRate: '10',
    creditLimit: '0',
    parentId: '',
    level: '1',
    status: 'active',
    customDomain: '',
    customEmail: '',
    maxUsers: '',
    maxNas: '',
  }
}

// ─── Component ───────────────────────────────────────────────────────
export function ResellerView() {
  const queryClient = useQueryClient()

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null)
  const [form, setForm] = useState(getDefaultForm())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingReseller, setDeletingReseller] = useState<Reseller | null>(null)

  // Topup dialog state
  const [topupDialogOpen, setTopupDialogOpen] = useState(false)
  const [topupReseller, setTopupReseller] = useState<Reseller | null>(null)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupDescription, setTopupDescription] = useState('')

  // Detail sheet state
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [detailResellerId, setDetailResellerId] = useState<string | null>(null)

  // ─── Queries ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<ResellersResponse>({
    queryKey: ['resellers', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', '20')
      const res = await fetch(`/api/resellers?${params}`)
      if (!res.ok) throw new Error('Failed to fetch resellers')
      return res.json()
    },
  })

  // Reseller list for parent dropdown (exclude current editing)
  const { data: allResellers } = useQuery<Reseller[]>({
    queryKey: ['resellers-parent-list'],
    queryFn: async () => {
      const res = await fetch('/api/resellers?limit=100')
      if (!res.ok) return []
      const json = await res.json()
      return json.resellers || []
    },
  })

  // Detail reseller
  const { data: detailReseller, isLoading: detailLoading } = useQuery({
    queryKey: ['reseller-detail', detailResellerId],
    queryFn: async () => {
      if (!detailResellerId) return null
      const res = await fetch(`/api/resellers/${detailResellerId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    enabled: !!detailResellerId,
  })

  // Commission history
  const { data: commissionData } = useQuery({
    queryKey: ['reseller-commissions', detailResellerId],
    queryFn: async () => {
      if (!detailResellerId) return null
      const res = await fetch(`/api/resellers/${detailResellerId}/commission?limit=50`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    enabled: !!detailResellerId,
  })

  // ─── Mutations ───────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create reseller')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] })
      toast.success('Reseller created successfully')
      closeDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/resellers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update reseller')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] })
      queryClient.invalidateQueries({ queryKey: ['reseller-detail'] })
      toast.success('Reseller updated successfully')
      closeDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resellers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete reseller')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] })
      toast.success('Reseller deleted successfully')
      setDeleteDialogOpen(false)
      setDeletingReseller(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const topupMutation = useMutation({
    mutationFn: async ({ id, amount, description }: { id: string; amount: number; description: string }) => {
      const res = await fetch(`/api/resellers/${id}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to topup balance')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] })
      queryClient.invalidateQueries({ queryKey: ['reseller-detail'] })
      toast.success('Balance topped up successfully')
      closeTopupDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  function openCreate() {
    setEditingReseller(null)
    setForm(getDefaultForm())
    setDialogOpen(true)
  }

  function openEdit(reseller: Reseller) {
    setEditingReseller(reseller)
    setForm({
      username: reseller.username,
      password: '',
      fullName: reseller.fullName,
      email: reseller.email,
      phone: reseller.phone || '',
      company: reseller.company || '',
      address: reseller.address || '',
      city: reseller.city || '',
      state: reseller.state || '',
      country: reseller.country || '',
      balance: String(reseller.balance),
      commissionRate: String(reseller.commissionRate),
      creditLimit: String(reseller.creditLimit),
      parentId: reseller.parentId || '',
      level: String(reseller.level),
      status: reseller.status,
      customDomain: reseller.customDomain || '',
      customEmail: reseller.customEmail || '',
      maxUsers: reseller.maxUsers ? String(reseller.maxUsers) : '',
      maxNas: reseller.maxNas ? String(reseller.maxNas) : '',
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingReseller(null)
    setForm(getDefaultForm())
  }

  function openTopup(reseller: Reseller) {
    setTopupReseller(reseller)
    setTopupAmount('')
    setTopupDescription('')
    setTopupDialogOpen(true)
  }

  function closeTopupDialog() {
    setTopupDialogOpen(false)
    setTopupReseller(null)
    setTopupAmount('')
    setTopupDescription('')
  }

  function openDetail(id: string) {
    setDetailResellerId(id)
    setDetailSheetOpen(true)
  }

  function handleSubmit() {
    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim()) {
      toast.error('Username, full name, and email are required')
      return
    }
    if (!editingReseller && !form.password.trim()) {
      toast.error('Password is required for new resellers')
      return
    }

    const payload: Record<string, unknown> = {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      balance: form.balance || '0',
      commissionRate: form.commissionRate || '10',
      creditLimit: form.creditLimit || '0',
      parentId: form.parentId || null,
      level: form.level || '1',
      status: form.status,
      customDomain: form.customDomain.trim() || null,
      customEmail: form.customEmail.trim() || null,
      maxUsers: form.maxUsers || null,
      maxNas: form.maxNas || null,
    }

    if (!editingReseller) {
      payload.password = form.password.trim()
    } else if (form.password.trim()) {
      payload.password = form.password.trim()
    }

    if (editingReseller) {
      updateMutation.mutate({ id: editingReseller.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleTopup() {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      toast.error('Enter a valid positive amount')
      return
    }
    if (!topupReseller) return
    topupMutation.mutate({
      id: topupReseller.id,
      amount: parseFloat(topupAmount),
      description: topupDescription.trim() || undefined,
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Compute hierarchy: map parentId → children
  const resellerList = data?.resellers || []
  const parentMap: Record<string, Reseller[]> = {}
  const topLevel = resellerList.filter((r) => !r.parentId)
  resellerList.forEach((r) => {
    if (r.parentId) {
      if (!parentMap[r.parentId]) parentMap[r.parentId] = []
      parentMap[r.parentId].push(r)
    }
  })

  function getChildren(parentId: string): Reseller[] {
    return parentMap[parentId] || []
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-transition">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Resellers</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold stat-number">{data?.stats?.total ?? 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold stat-number text-emerald-600">{data?.stats?.active ?? 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Commission Paid</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold stat-number">${(data?.stats?.totalCommissionPaid ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reseller Revenue</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold stat-number">${(data?.stats?.totalRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Card className="card-hover flex-1 min-w-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search resellers..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reseller
        </Button>
      </div>

      {/* Reseller Hierarchy + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Resellers
              {!isLoading && (
                <Badge variant="secondary" className="text-[10px] font-normal ml-1">
                  {data?.pagination?.total ?? 0}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : !resellerList.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No resellers found</p>
              <p className="text-xs mt-1">Create your first reseller to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Reseller</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell">Company</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell">Email</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-right">Balance</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-right hidden sm:table-cell">Commission</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-center hidden md:table-cell">Transactions</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell">Level</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLevel.map((reseller) => (
                    <ResellerRow
                      key={reseller.id}
                      reseller={reseller}
                      depth={0}
                      getChildren={getChildren}
                      allResellers={allResellers || []}
                      onEdit={openEdit}
                      onDelete={(r) => { setDeletingReseller(r); setDeleteDialogOpen(true) }}
                      onTopup={openTopup}
                      onDetail={openDetail}
                      parentMap={parentMap}
                    />
                  ))}
                  {/* Render orphan children not under any top-level */}
                  {resellerList
                    .filter((r) => r.parentId && !resellerList.find((p) => p.id === r.parentId))
                    .map((reseller) => (
                      <ResellerRow
                        key={reseller.id}
                        reseller={reseller}
                        depth={0}
                        getChildren={getChildren}
                        allResellers={allResellers || []}
                        onEdit={openEdit}
                        onDelete={(r) => { setDeletingReseller(r); setDeleteDialogOpen(true) }}
                        onTopup={openTopup}
                        onDetail={openDetail}
                        parentMap={parentMap}
                      />
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReseller ? 'Edit Reseller' : 'Create Reseller'}</DialogTitle>
            <DialogDescription>
              {editingReseller ? 'Update reseller account details' : 'Add a new reseller to the platform'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="reseller001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{editingReseller ? 'Password (leave blank to keep)' : 'Password *'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="reseller@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Acme ISP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="US" />
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Billing & Limits</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance">Initial Balance ($)</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  step="0.1"
                  value={form.commissionRate}
                  onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit Limit ($)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hierarchy</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Reseller</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                  <SelectTrigger><SelectValue placeholder="None (Top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top-level)</SelectItem>
                    {(allResellers || [])
                      .filter((r) => r.id !== editingReseller?.id)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.fullName} ({r.username})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Hierarchy Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1 - Master</SelectItem>
                    <SelectItem value="2">Level 2 - Distributor</SelectItem>
                    <SelectItem value="3">Level 3 - Sub-Distributor</SelectItem>
                    <SelectItem value="4">Level 4 - Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branding & Limits</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input id="maxUsers" type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} placeholder="Unlimited" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxNas">Max NAS Devices</Label>
                <Input id="maxNas" type="number" value={form.maxNas} onChange={(e) => setForm({ ...form, maxNas: e.target.value })} placeholder="Unlimited" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input id="customDomain" value={form.customDomain} onChange={(e) => setForm({ ...form, customDomain: e.target.value })} placeholder="portal.example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customEmail">Custom Email</Label>
                <Input id="customEmail" type="email" value={form.customEmail} onChange={(e) => setForm({ ...form, customEmail: e.target.value })} placeholder="support@example.com" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingReseller ? 'Update Reseller' : 'Create Reseller'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topup Dialog */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Topup Balance
            </DialogTitle>
            <DialogDescription>
              Add funds to {topupReseller?.fullName || topupReseller?.username}&apos;s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {topupReseller && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Current Balance</span>
                <span className="text-lg font-bold">${topupReseller.balance.toFixed(2)}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="topupAmount">Amount ($)</Label>
              <Input
                id="topupAmount"
                type="number"
                step="0.01"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="100.00"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topupDesc">Description (optional)</Label>
              <Input
                id="topupDesc"
                value={topupDescription}
                onChange={(e) => setTopupDescription(e.target.value)}
                placeholder="Monthly topup"
              />
            </div>
            {topupAmount && parseFloat(topupAmount) > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-muted-foreground">New balance after topup</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  ${((topupReseller?.balance || 0) + parseFloat(topupAmount)).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTopupDialog}>Cancel</Button>
            <Button onClick={handleTopup} disabled={topupMutation.isPending || !topupAmount}>
              {topupMutation.isPending ? 'Processing...' : 'Topup Balance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reseller</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingReseller?.fullName}</strong> ({deletingReseller?.username})?
              This will also delete all associated commission and transaction records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReseller && deleteMutation.mutate(deletingReseller.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reseller Details</SheetTitle>
          </SheetHeader>
          {detailLoading || !detailReseller ? (
            <div className="py-8 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Separator />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Overview */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {detailReseller.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{detailReseller.fullName}</h3>
                    <p className="text-xs text-muted-foreground">@{detailReseller.username}</p>
                  </div>
                  <Badge variant="outline" className={cn('ml-auto', STATUS_CONFIG[detailReseller.status]?.className)}>
                    {STATUS_CONFIG[detailReseller.status]?.label}
                  </Badge>
                </div>
                {detailReseller.company && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> {detailReseller.company}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Balance</p>
                    <p className="text-lg font-bold">${detailReseller.balance.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Commission Rate</p>
                    <p className="text-lg font-bold">{detailReseller.commissionRate}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Credit Limit</p>
                    <p className="text-lg font-bold">${detailReseller.creditLimit.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Level</p>
                    <p className="text-sm font-bold">
                      {LEVEL_CONFIG[detailReseller.level]?.label || `Level ${detailReseller.level}`}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Email:</span> {detailReseller.email}</p>
                  {detailReseller.phone && <p><span className="font-medium text-foreground">Phone:</span> {detailReseller.phone}</p>}
                  {detailReseller.address && <p><span className="font-medium text-foreground">Address:</span> {detailReseller.address}{detailReseller.city ? `, ${detailReseller.city}` : ''}{detailReseller.state ? `, ${detailReseller.state}` : ''}{detailReseller.country ? ` ${detailReseller.country}` : ''}</p>}
                  {detailReseller.customDomain && <p><span className="font-medium text-foreground">Domain:</span> {detailReseller.customDomain}</p>}
                  {detailReseller.maxUsers && <p><span className="font-medium text-foreground">Max Users:</span> {detailReseller.maxUsers}</p>}
                  {detailReseller.maxNas && <p><span className="font-medium text-foreground">Max NAS:</span> {detailReseller.maxNas}</p>}
                </div>
              </div>

              {/* Tabs for commissions and transactions */}
              <Tabs defaultValue="commissions">
                <TabsList className="w-full">
                  <TabsTrigger value="commissions" className="flex-1">Commissions</TabsTrigger>
                  <TabsTrigger value="transactions" className="flex-1">Transactions</TabsTrigger>
                </TabsList>
                <TabsContent value="commissions" className="space-y-3">
                  {commissionData && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950">
                        <p className="text-[10px] text-muted-foreground">Pending</p>
                        <p className="font-bold text-amber-600">${commissionData.stats.totalPending.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950">
                        <p className="text-[10px] text-muted-foreground">Paid</p>
                        <p className="font-bold text-emerald-600">${commissionData.stats.totalPaid.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {(commissionData?.commissions || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No commissions yet</p>
                      ) : (
                        commissionData?.commissions.map((c: Commission) => (
                          <div key={c.id} className="flex items-center justify-between p-2 rounded-md border text-xs">
                            <div>
                              <p className="font-medium">{c.username}</p>
                              <p className="text-muted-foreground">{c.invoiceId || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${c.amount.toFixed(2)}</p>
                              <Badge variant="outline" className={cn('text-[9px]', STATUS_CONFIG[c.status]?.className)}>
                                {c.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="transactions" className="space-y-3">
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {(detailReseller.transactions || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
                      ) : (
                        detailReseller.transactions.map((t: Transaction) => {
                          const txConfig = TX_TYPE_CONFIG[t.type] || TX_TYPE_CONFIG.adjustment
                          const TxIcon = txConfig.icon
                          return (
                            <div key={t.id} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                                t.type === 'topup' ? 'bg-emerald-100 dark:bg-emerald-950' :
                                t.type === 'deduction' ? 'bg-red-100 dark:bg-red-950' :
                                t.type === 'commission' ? 'bg-amber-100 dark:bg-amber-950' :
                                'bg-violet-100 dark:bg-violet-950'
                              )}>
                                <TxIcon className={cn('h-3.5 w-3.5', txConfig.color)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{t.description || txConfig.label}</p>
                                <p className="text-muted-foreground">{t.type} &middot; {new Date(t.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={cn('font-bold', t.type === 'topup' || t.type === 'commission' ? 'text-emerald-600' : 'text-red-600')}>
                                  {t.type === 'topup' || t.type === 'commission' ? '+' : '-'}${t.amount.toFixed(2)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  ${t.balanceBefore.toFixed(2)} → ${t.balanceAfter.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Recursive Reseller Row ──────────────────────────────────────────
function ResellerRow({
  reseller,
  depth,
  getChildren,
  allResellers,
  onEdit,
  onDelete,
  onTopup,
  onDetail,
  parentMap,
}: {
  reseller: Reseller
  depth: number
  getChildren: (id: string) => Reseller[]
  allResellers: Reseller[]
  onEdit: (r: Reseller) => void
  onDelete: (r: Reseller) => void
  onTopup: (r: Reseller) => void
  onDetail: (id: string) => void
  parentMap: Record<string, Reseller[]>
}) {
  const children = getChildren(reseller.id)
  const hasChildren = children.length > 0
  const parent = allResellers.find((r) => r.id === reseller.parentId)
  const levelConfig = LEVEL_CONFIG[reseller.level] || LEVEL_CONFIG[1]

  return (
    <>
      <TableRow className={cn('group', depth > 0 && 'bg-muted/20')}>
        <TableCell className="py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {depth > 0 && (
              <div className="flex items-center text-muted-foreground/40">
                <ChevronRight className="h-3 w-3" />
              </div>
            )}
            {hasChildren && depth === 0 && (
              <Copy className="h-3.5 w-3.5 text-amber-500" />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {reseller.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{reseller.fullName}</p>
                <p className="text-[10px] text-muted-foreground truncate">@{reseller.username}</p>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <div className="text-xs">
            {reseller.company || '—'}
            {parent && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Parent: {parent.fullName}
              </p>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <span className="text-xs text-muted-foreground">{reseller.email}</span>
        </TableCell>
        <TableCell className="text-right">
          <span className={cn('text-sm font-semibold tabular-nums', reseller.balance > 0 ? 'text-emerald-600' : reseller.balance < 0 ? 'text-red-600' : '')}>
            ${reseller.balance.toFixed(2)}
          </span>
        </TableCell>
        <TableCell className="text-right hidden sm:table-cell">
          <span className="text-xs font-medium tabular-nums">{reseller.commissionRate}%</span>
        </TableCell>
        <TableCell className="text-center hidden md:table-cell">
          <span className="text-xs text-muted-foreground tabular-nums">{reseller._count.transactions}</span>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cn('text-[10px]', STATUS_CONFIG[reseller.status]?.className)}>
            {STATUS_CONFIG[reseller.status]?.label}
          </Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Badge variant="outline" className={cn('text-[10px] gap-1', levelConfig.color, levelConfig.bg, 'border-0')}>
            <Crown className="h-2.5 w-2.5" />
            L{reseller.level}
          </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDetail(reseller.id)} className="gap-2">
                <Eye className="h-3.5 w-3.5" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(reseller)} className="gap-2">
                <Edit className="h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTopup(reseller)} className="gap-2">
                <Wallet className="h-3.5 w-3.5" /> Topup Balance
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(reseller)} className="gap-2 text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {/* Recursively render children */}
      {hasChildren && children.map((child) => (
        <ResellerRow
          key={child.id}
          reseller={child}
          depth={depth + 1}
          getChildren={getChildren}
          allResellers={allResellers}
          onEdit={onEdit}
          onDelete={onDelete}
          onTopup={onTopup}
          onDetail={onDetail}
          parentMap={parentMap}
        />
      ))}
    </>
  )
}
