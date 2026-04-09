'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Ticket,
  Tag,
  Gift,
  Percent,
  Calendar,
  Edit,
  Trash2,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Users,
  DollarSign,
  Clock,
  Zap,
  ShieldCheck,
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Types ───────────────────────────────────────────────────────────
interface Coupon {
  id: string
  code: string
  name: string
  description: string | null
  discountType: string
  discountValue: number
  freeTrialDays: number | null
  maxUses: number | null
  usedCount: number
  minOrderAmount: number | null
  maxDiscount: number | null
  applicablePlans: string | null
  startDate: string | null
  expiresAt: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface CouponsResponse {
  coupons: Coupon[]
  stats: {
    totalCoupons: number
    activeCoupons: number
    redeemedCoupons: number
    totalDiscountGiven: number
    totalUses: number
  }
}

// ─── Status config ──────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Active' },
  disabled: { variant: 'secondary', label: 'Disabled' },
  expired: { variant: 'destructive', label: 'Expired' },
}

const DISCOUNT_TYPE_BADGE: Record<string, { color: string; label: string }> = {
  percentage: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', label: 'Percentage' },
  flat: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-800', label: 'Flat' },
  free_trial: { color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 border-violet-200 dark:border-violet-800', label: 'Free Trial' },
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  return `$${amount.toFixed(2)}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function isScheduled(startDate: string | null): boolean {
  if (!startDate) return false
  return new Date(startDate) > new Date()
}

// ─── Component ───────────────────────────────────────────────────────
export function CouponsView() {
  const queryClient = useQueryClient()

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; code: string } | null>(null)

  // Form state
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    freeTrialDays: '',
    maxUses: '',
    minOrderAmount: '',
    maxDiscount: '',
    startDate: '',
    expiresAt: '',
    status: 'active',
  })

  // ─── Queries ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<CouponsResponse>({
    queryKey: ['coupons', search, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('discountType', typeFilter)
      const res = await fetch(`/api/coupons?${params}`)
      if (!res.ok) throw new Error('Failed to fetch coupons')
      return res.json()
    },
  })

  // ─── Mutations ──────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (formData: Record<string, unknown>) => {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create coupon') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon created successfully')
      closeDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Record<string, unknown> }) => {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update coupon') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon updated successfully')
      closeDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to delete coupon') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon deleted')
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async (coupon: Coupon) => {
      const newStatus = coupon.status === 'active' ? 'disabled' : 'active'
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  function resetForm() {
    setForm({
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      freeTrialDays: '',
      maxUses: '',
      minOrderAmount: '',
      maxDiscount: '',
      startDate: '',
      expiresAt: '',
      status: 'active',
    })
    setEditing(null)
  }

  function closeDialog() {
    setDialogOpen(false)
    resetForm()
  }

  function openCreate() {
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon)
    setForm({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      freeTrialDays: coupon.freeTrialDays ? String(coupon.freeTrialDays) : '',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : '',
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      startDate: coupon.startDate ? coupon.startDate.split('T')[0] : '',
      expiresAt: coupon.expiresAt ? coupon.expiresAt.split('T')[0] : '',
      status: coupon.status,
    })
    setDialogOpen(true)
  }

  function submitForm() {
    if (!form.code.trim()) { toast.error('Coupon code is required'); return }
    if (!form.name.trim()) { toast.error('Coupon name is required'); return }
    if (!form.discountValue || parseFloat(form.discountValue) < 0) { toast.error('Valid discount value required'); return }

    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      freeTrialDays: form.freeTrialDays ? parseInt(form.freeTrialDays, 10) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      startDate: form.startDate || null,
      expiresAt: form.expiresAt || null,
    }

    if (editing) {
      payload.status = form.status
      updateMutation.mutate({ id: editing.id, formData: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success(`Copied "${code}" to clipboard`)
  }

  function confirmDelete(id: string, name: string, code: string) {
    setDeleteTarget({ id, name, code })
    setDeleteDialogOpen(true)
  }

  const stats = data?.stats
  const coupons = data?.coupons || []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-transition">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Coupons</p>
                {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold stat-number">{stats?.totalCoupons ?? 0}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold stat-number text-emerald-600">{stats?.activeCoupons ?? 0}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Redeemed</p>
                {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold stat-number">{stats?.redeemedCoupons ?? 0}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Discount Given</p>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold stat-number text-rose-600">{formatCurrency(stats?.totalDiscountGiven ?? 0)}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Card className="card-hover flex-1 min-w-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="relative sm:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="free_trial">Free Trial</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full sm:w-auto" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Coupon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Ticket className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>No coupons found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => {
                    const expired = isExpired(coupon.expiresAt)
                    const scheduled = isScheduled(coupon.startDate)
                    const displayStatus = expired && coupon.status === 'active' ? 'expired' : coupon.status
                    const usagePercent = coupon.maxUses ? Math.min(100, (coupon.usedCount / coupon.maxUses) * 100) : null

                    return (
                      <TableRow key={coupon.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyCode(coupon.code)}
                              className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded hover:bg-muted/80 transition-colors cursor-pointer"
                              title="Click to copy"
                            >
                              {coupon.code}
                            </button>
                            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => copyCode(coupon.code)} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{coupon.name}</p>
                            {coupon.description && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{coupon.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px] border", DISCOUNT_TYPE_BADGE[coupon.discountType]?.color)}>
                            {DISCOUNT_TYPE_BADGE[coupon.discountType]?.label || coupon.discountType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold">
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}%`
                              : coupon.discountType === 'free_trial'
                                ? `${coupon.freeTrialDays || 0} days`
                                : formatCurrency(coupon.discountValue)}
                          </span>
                          {coupon.maxDiscount && coupon.discountType === 'percentage' && (
                            <p className="text-[10px] text-muted-foreground">max {formatCurrency(coupon.maxDiscount)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm font-medium">
                              {coupon.usedCount}
                              {coupon.maxUses ? `/${coupon.maxUses}` : ''}
                            </span>
                            {usagePercent !== null && (
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    usagePercent >= 100 ? "bg-rose-500" : usagePercent >= 75 ? "bg-amber-500" : "bg-emerald-500"
                                  )}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {coupon.minOrderAmount ? formatCurrency(coupon.minOrderAmount) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {scheduled && (
                              <Badge variant="outline" className="text-[10px] border-sky-300 text-sky-600 dark:border-sky-700 dark:text-sky-400">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                Starts {formatDate(coupon.startDate)}
                              </Badge>
                            )}
                            <p className={cn("text-xs", expired ? "text-rose-600 dark:text-rose-400 font-medium" : "text-muted-foreground")}>
                              {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[displayStatus]?.variant || 'outline'}>
                            {STATUS_BADGE[displayStatus]?.label || displayStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleStatusMutation.mutate(coupon)}
                              title={displayStatus === 'active' ? 'Disable' : 'Enable'}
                            >
                              {displayStatus === 'active' ? (
                                <ToggleRight className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(coupon)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => confirmDelete(coupon.id, coupon.name, coupon.code)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Create/Edit Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modify the coupon configuration' : 'Define a new discount coupon for customers'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Coupon Code *</Label>
                <Input
                  placeholder="e.g. SUMMER2024"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="font-mono uppercase"
                />
              </div>
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g. Summer Sale"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this coupon..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Discount Type *</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="h-3.5 w-3.5" />
                        Percentage
                      </div>
                    </SelectItem>
                    <SelectItem value="flat">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5" />
                        Flat Amount
                      </div>
                    </SelectItem>
                    <SelectItem value="free_trial">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        Free Trial
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>
                  {form.discountType === 'free_trial' ? 'Trial Days *' : form.discountType === 'percentage' ? 'Discount % *' : 'Amount ($) *'}
                </Label>
                <Input
                  type="number"
                  step={form.discountType === 'free_trial' ? '1' : '0.01'}
                  min="0"
                  placeholder={form.discountType === 'free_trial' ? '7' : form.discountType === 'percentage' ? '15' : '10.00'}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                />
              </div>
            </div>

            {form.discountType === 'percentage' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Max Discount ($)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="50.00"
                      value={form.maxDiscount}
                      onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Cap for percentage discounts</p>
                </div>
                <div className="grid gap-2">
                  <Label>Min Order Amount ($)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="25.00"
                      value={form.minOrderAmount}
                      onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  </div>
                </div>
              </div>
            )}

            {form.discountType !== 'free_trial' && (
              <div className="grid gap-2">
                <Label>Min Order Amount ($)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Minimum invoice amount required to apply</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">Leave empty for unlimited</p>
              </div>
              {form.discountType === 'free_trial' && (
                <div className="grid gap-2">
                  <Label>Free Trial Days</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="7"
                    value={form.freeTrialDays}
                    onChange={(e) => setForm({ ...form, freeTrialDays: e.target.value })}
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>

            {editing && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={submitForm} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editing ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot; ({deleteTarget?.code})?
              All usage history will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return
                deleteMutation.mutate(deleteTarget.id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
