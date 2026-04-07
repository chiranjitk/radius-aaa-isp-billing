'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  LucideIcon,
  Clock,
  UserCircle,
  Mail,
  Phone,
  CreditCard,
  FileText,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ==========================================
// Types
// ==========================================

interface Registration {
  id: string
  username: string
  password?: string
  fullName?: string
  email?: string
  phone?: string
  company?: string
  address?: string
  planId?: string
  status: string
  approvedBy?: string
  approvedAt?: string
  rejectReason?: string
  createdAt: string
}

interface RegistrationsResponse {
  registrations: Registration[]
  total: number
  page: number
  totalPages: number
}

// ==========================================
// Status Configuration
// ==========================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800',
    icon: XCircle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    icon: ShieldCheck,
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`gap-1.5 text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ==========================================
// New Registration Dialog
// ==========================================

function NewRegistrationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create registration')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Registration submitted successfully')
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      onOpenChange(false)
      setFormData({ username: '', password: '', fullName: '', email: '', phone: '', company: '', address: '' })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error('Username and password are required')
      return
    }
    createMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Registration
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reg-username">Username <span className="text-destructive">*</span></Label>
              <Input
                id="reg-username"
                placeholder="username"
                value={formData.username}
                onChange={(e) => setFormData((d) => ({ ...d, username: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData((d) => ({ ...d, password: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-fullname">Full Name</Label>
              <Input
                id="reg-fullname"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData((d) => ({ ...d, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Phone</Label>
              <Input
                id="reg-phone"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData((d) => ({ ...d, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-company">Company</Label>
              <Input
                id="reg-company"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={(e) => setFormData((d) => ({ ...d, company: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-address">Address</Label>
            <Input
              id="reg-address"
              placeholder="123 Main St, City, Country"
              value={formData.address}
              onChange={(e) => setFormData((d) => ({ ...d, address: e.target.value }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Submit Registration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// Registration Detail Dialog
// ==========================================

function RegistrationDetailDialog({
  open,
  onOpenChange,
  registration,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  registration: Registration | null
}) {
  if (!registration) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Registration Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{registration.fullName || registration.username}</span>
            <StatusBadge status={registration.status} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <UserCircle className="h-3 w-3" /> Username
              </p>
              <p className="text-sm font-medium">{registration.username}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </p>
              <p className="text-sm font-medium">{registration.email || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </p>
              <p className="text-sm font-medium">{registration.phone || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Company
              </p>
              <p className="text-sm font-medium">{registration.company || '—'}</p>
            </div>
            <div className="col-span-2 space-y-0.5">
              <p className="text-[11px] text-muted-foreground">Address</p>
              <p className="text-sm font-medium">{registration.address || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">{format(new Date(registration.createdAt), 'MMM dd, yyyy HH:mm')}</p>
            </div>
          </div>

          {registration.approvedAt && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-3">
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Approved at: {format(new Date(registration.approvedAt), 'MMM dd, yyyy HH:mm')}
                {registration.approvedBy && ` by ${registration.approvedBy}`}
              </p>
            </div>
          )}

          {registration.rejectReason && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 p-3">
              <p className="text-xs text-red-800 dark:text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Rejection reason: {registration.rejectReason}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// Main Component
// ==========================================

export function RegistrationsView() {
  const queryClient = useQueryClient()

  // Filters & pagination
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  // Dialogs
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailRegistration, setDetailRegistration] = useState<Registration | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Fetch registrations
  const {
    data: registrationsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<RegistrationsResponse>({
    queryKey: ['registrations', search, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', String(limit))
      const res = await fetch(`/api/registrations?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
  })

  const registrations = registrationsData?.registrations || []
  const totalPages = registrationsData?.totalPages || 0
  const total = registrationsData?.total || 0

  const handleSearch = useCallback(() => {
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await fetch(`/api/registrations/${regId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', approvedBy: 'admin' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to approve registration')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Registration approved — user account created')
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ regId, reason }: { regId: string; reason: string }) => {
      const res = await fetch(`/api/registrations/${regId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', approvedBy: 'admin', rejectReason: reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reject registration')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Registration rejected')
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      setRejectDialogOpen(false)
      setRejectTarget(null)
      setRejectReason('')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleReject = () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    rejectMutation.mutate({ regId: rejectTarget.id, reason: rejectReason.trim() })
  }

  // Stats cards
  const pendingCount = registrationsData ? (async () => {
    const res = await fetch('/api/registrations?status=pending&limit=1')
    const data = await res.json()
    return data.total || 0
  })() : 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="card-hover p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{registrations.filter((r) => r.status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="card-hover p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{registrations.filter((r) => r.status === 'completed').length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="card-hover p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{registrations.filter((r) => r.status === 'rejected').length}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, name, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch} className="shrink-0">
              Search
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-36">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              onClick={() => setNewDialogOpen(true)}
              className="gap-1.5 shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              New Registration
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError || registrations.length === 0 ? (
          <div className="py-16 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {isError ? 'Error loading registrations' : 'No registrations found'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isError ? 'Please try again later' : 'New registration requests will appear here'}
            </p>
            {!isError && (
              <Button size="sm" onClick={() => setNewDialogOpen(true)} className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Create Registration
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">Username</TableHead>
                  <TableHead className="text-xs font-semibold">Full Name</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Plan</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id} className="group">
                    <TableCell className="font-mono text-sm font-medium">{reg.username}</TableCell>
                    <TableCell className="text-sm">{reg.fullName || '—'}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell text-muted-foreground">{reg.email || '—'}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell text-muted-foreground">{reg.phone || '—'}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell text-muted-foreground">{reg.planId ? 'Assigned' : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={reg.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {format(new Date(reg.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setDetailRegistration(reg)
                            setDetailDialogOpen(true)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {reg.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => approveMutation.mutate(reg.id)}
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => {
                                setRejectTarget(reg)
                                setRejectDialogOpen(true)
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                if (pageNum < 1 || pageNum > totalPages) return null
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <NewRegistrationDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
      <RegistrationDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        registration={detailRegistration}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Registration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to reject the registration for <strong>{rejectTarget?.username}</strong>.
              Please provide a reason.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason <span className="text-destructive">*</span></Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
