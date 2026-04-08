'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  Ticket,
  Plus,
  RefreshCw,
  Search,
  X,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Archive,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  MessageSquare,
  ArrowRight,
  Loader2,
  Send,
  Download,
  FileSpreadsheet,
  FileJson,
  Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'
import { cn } from '@/lib/utils'

// ==================== Types ====================

interface TicketItem {
  id: string
  ticketNo: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  username: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

interface TicketsResponse {
  tickets: TicketItem[]
  total: number
  page: number
  totalPages: number
  stats: {
    openCount: number
    inProgressCount: number
    resolvedCount: number
    closedCount: number
    criticalCount: number
    totalTickets: number
  }
}

// ==================== Config ====================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: {
    label: 'Open',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
    icon: CircleDot,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/40',
    icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/40',
    icon: Archive,
  },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: {
    label: 'Critical',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200/60 dark:border-red-800/40',
  },
  high: {
    label: 'High',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40',
  },
  medium: {
    label: 'Medium',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
  },
  low: {
    label: 'Low',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/40',
  },
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  billing: {
    label: 'Billing',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40',
  },
  technical: {
    label: 'Technical',
    color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/40',
  },
  account: {
    label: 'Account',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40',
  },
  network: {
    label: 'Network',
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40',
  },
  general: {
    label: 'General',
    color: 'bg-slate-50 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40',
  },
}

// ==================== Component ====================

export default function TicketsView() {
  const queryClient = useQueryClient()

  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Create ticket dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general',
    username: '',
    assignedTo: '',
  })
  const [createPending, setCreatePending] = useState(false)

  // Ticket detail sheet
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ticket: TicketItem | null }>({ open: false, ticket: null })

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status: newStatus }: { id: string; status: string }) => {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: (_data, variables) => {
      toast.success(`Ticket status updated to ${STATUS_CONFIG[variables.status]?.label || variables.status}`)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      if (selectedTicket && selectedTicket.id === variables.id) {
        setSelectedTicket({
          ...selectedTicket,
          status: variables.status,
          resolvedAt: ['resolved', 'closed'].includes(variables.status)
            ? new Date().toISOString()
            : null,
          updatedAt: new Date().toISOString(),
        })
      }
    },
    onError: () => {
      toast.error('Failed to update ticket status')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'closed' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ticket closed successfully')
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setDeleteDialog({ open: false, ticket: null })
      setSheetOpen(false)
      setSelectedTicket(null)
    },
    onError: () => {
      toast.error('Failed to close ticket')
    },
  })

  // Fetch tickets
  const { data, isLoading, isFetching, refetch } = useQuery<TicketsResponse>({
    queryKey: ['tickets', page, search, statusFilter, priorityFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter && priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await fetch(`/api/tickets?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
  })

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (formData: typeof createForm) => {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ticket created successfully')
      setCreateOpen(false)
      setCreateForm({ subject: '', description: '', priority: 'medium', category: 'general', username: '', assignedTo: '' })
      setCreatePending(false)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: () => {
      toast.error('Failed to create ticket')
      setCreatePending(false)
    },
  })

  // Handlers
  const handleSearch = useCallback(() => {
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setSearchInput('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setPage(1)
  }, [])

  const handleViewTicket = useCallback((ticket: TicketItem) => {
    setSelectedTicket(ticket)
    setSheetOpen(true)
  }, [])

  const handleCreateTicket = useCallback(() => {
    if (!createForm.subject || !createForm.description || !createForm.username) {
      toast.error('Please fill in all required fields')
      return
    }
    setCreatePending(true)
    createMutation.mutate(createForm)
  }, [createForm, createMutation])

  const handleStatusChange = useCallback((newStatus: string) => {
    if (!selectedTicket) return
    statusMutation.mutate({ id: selectedTicket.id, status: newStatus })
  }, [selectedTicket, statusMutation])

  const handleExport = useCallback((formatType: 'csv' | 'json') => {
    if (!data?.tickets || data.tickets.length === 0) return
    const opts: ExportOptions = {
      title: 'Tickets Export',
      headers: ['Ticket #', 'Subject', 'Username', 'Status', 'Priority', 'Category', 'Assigned To', 'Created At', 'Resolved At'],
      filename: `tickets-export-${new Date().toISOString().slice(0, 10)}`,
      rows: data.tickets.map((t) => [
        t.ticketNo,
        t.subject,
        t.username,
        STATUS_CONFIG[t.status]?.label || t.status,
        PRIORITY_CONFIG[t.priority]?.label || t.priority,
        CATEGORY_CONFIG[t.category]?.label || t.category,
        t.assignedTo || 'Unassigned',
        format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
        t.resolvedAt ? format(new Date(t.resolvedAt), 'yyyy-MM-dd HH:mm') : '',
      ]),
    }
    if (formatType === 'csv') {
      exportToCSV(opts)
      toast.success(`${data.tickets.length} tickets exported as CSV`)
    } else {
      exportToJSON(opts)
      toast.success(`${data.tickets.length} tickets exported as JSON`)
    }
  }, [data])

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-1 relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open</p>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 stat-number">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.openCount || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                <CircleDot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400" />
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-2 relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400 stat-number">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.inProgressCount || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-violet-400" />
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-3 relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolved</p>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 stat-number">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.resolvedCount || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          </CardContent>
        </Card>

        <Card className="stat-card hover-lift card-shine animate-fade-in-up stagger-4 relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Critical</p>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 stat-number">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.criticalCount || 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-400" />
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Ticket className="h-4 w-4" />
          <span>
            {isLoading ? 'Loading...' : `${data?.total || 0} ticket${(data?.total || 0) !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading || !data?.tickets?.length} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')} className="gap-2">
                <FileJson className="h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Ticket */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Ticket</DialogTitle>
                <DialogDescription>Submit a new support ticket for the helpdesk team.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="tk-subject">Subject *</Label>
                  <Input
                    id="tk-subject"
                    placeholder="Brief description of the issue"
                    value={createForm.subject}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tk-description">Description *</Label>
                  <Textarea
                    id="tk-description"
                    placeholder="Detailed description of the issue, steps to reproduce, expected behavior..."
                    rows={4}
                    value={createForm.description}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tk-priority">Priority</Label>
                    <Select value={createForm.priority} onValueChange={(v) => setCreateForm((prev) => ({ ...prev, priority: v }))}>
                      <SelectTrigger id="tk-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tk-category">Category</Label>
                    <Select value={createForm.category} onValueChange={(v) => setCreateForm((prev) => ({ ...prev, category: v }))}>
                      <SelectTrigger id="tk-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="network">Network</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tk-username">Username (RADIUS) *</Label>
                    <Input
                      id="tk-username"
                      placeholder="RADIUS username"
                      value={createForm.username}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tk-assigned">Assign To</Label>
                    <Input
                      id="tk-assigned"
                      placeholder="e.g. admin, noc-team"
                      value={createForm.assignedTo}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTicket} disabled={createPending} className="gap-2">
                  {createPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Send className="h-4 w-4" />
                  Create Ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by number, subject, username..."
            className="pl-9 pr-10 h-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Category</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="network">Network</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9 gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <Card className="animate-fade-in-up">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : !data?.tickets || data.tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Ticket className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No tickets found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFilters ? 'Try adjusting your filters or search criteria' : 'Create a new ticket to get started'}
              </p>
              {!hasFilters && (
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Ticket
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px] text-xs font-semibold">Ticket #</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[200px]">Subject</TableHead>
                      <TableHead className="w-[110px] text-xs font-semibold">User</TableHead>
                      <TableHead className="w-[110px] text-xs font-semibold">Status</TableHead>
                      <TableHead className="w-[90px] text-xs font-semibold">Priority</TableHead>
                      <TableHead className="w-[90px] text-xs font-semibold">Category</TableHead>
                      <TableHead className="w-[110px] text-xs font-semibold">Assigned</TableHead>
                      <TableHead className="w-[100px] text-xs font-semibold">Date</TableHead>
                      <TableHead className="w-[60px] text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tickets.map((ticket, idx) => {
                      const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                      const prioCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium
                      const catCfg = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.general
                      const StatusIcon = statusCfg.icon

                      return (
                        <TableRow
                          key={ticket.id}
                          className={cn(
                            'table-row-hover group cursor-pointer',
                            `animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`,
                            ticket.priority === 'critical' && ticket.status !== 'closed' && 'border-l-2 border-l-red-500'
                          )}
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <TableCell className="font-mono text-xs font-medium text-primary">
                            {ticket.ticketNo}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0 max-w-[280px]">
                              <p className="text-sm font-medium truncate">{ticket.subject}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <UserCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs font-medium truncate max-w-[80px]">{ticket.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] font-semibold gap-1 px-2 py-0.5', statusCfg.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0.5', prioCfg.color)}>
                              {prioCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] font-medium px-2 py-0.5', catCfg.color)}>
                              {catCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {ticket.assignedTo || (
                                <span className="text-muted-foreground/50 italic">Unassigned</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: false })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleViewTicket(ticket) }}
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Page {data.page} of {data.totalPages} ({data.total} total)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={data.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, data.page - 2) + i
                      if (pageNum > data.totalPages) return null
                      return (
                        <Button
                          key={pageNum}
                          variant={data.page === pageNum ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8 text-xs"
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
                      disabled={data.page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl">
          {selectedTicket && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-primary">{selectedTicket.ticketNo}</span>
                </SheetTitle>
                <SheetDescription>{selectedTicket.subject}</SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-6 h-[calc(100vh-180px)] pr-4">
                <div className="space-y-6">
                  {/* Status & Priority & Category Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs font-semibold gap-1 px-2.5 py-1', STATUS_CONFIG[selectedTicket.status]?.color)}>
                      {(() => {
                        const Icon = STATUS_CONFIG[selectedTicket.status]?.icon || CircleDot
                        return <Icon className="h-3.5 w-3.5" />
                      })()}
                      {STATUS_CONFIG[selectedTicket.status]?.label}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs font-semibold px-2.5 py-1', PRIORITY_CONFIG[selectedTicket.priority]?.color)}>
                      {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs font-medium px-2.5 py-1', CATEGORY_CONFIG[selectedTicket.category]?.color)}>
                      {CATEGORY_CONFIG[selectedTicket.category]?.label}
                    </Badge>
                  </div>

                  {/* Status Change Actions */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Status</p>
                      <div className="flex flex-wrap gap-2">
                        {['open', 'in_progress', 'resolved', 'closed'].map((s) => {
                          const cfg = STATUS_CONFIG[s]
                          if (!cfg) return null
                          const Icon = cfg.icon
                          const isActive = selectedTicket.status === s
                          const isDisabled = isActive || statusMutation.isPending

                          return (
                            <Button
                              key={s}
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              className={cn(
                                'gap-1.5 text-xs',
                                isActive && 'shadow-sm',
                                isDisabled && 'opacity-50 cursor-not-allowed'
                              )}
                              disabled={isDisabled}
                              onClick={() => handleStatusChange(s)}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {cfg.label}
                              {s === 'resolved' && !isActive && (
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Description */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Description
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.description}
                    </div>
                  </div>

                  <Separator />

                  {/* Details Grid */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Username</span>
                        <div className="flex items-center gap-1.5">
                          <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{selectedTicket.username}</span>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Assigned To</span>
                        <span className={cn('font-medium', !selectedTicket.assignedTo && 'text-muted-foreground italic')}>
                          {selectedTicket.assignedTo || 'Unassigned'}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Priority</span>
                        <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0.5', PRIORITY_CONFIG[selectedTicket.priority]?.color)}>
                          {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Category</span>
                        <Badge variant="outline" className={cn('text-[10px] font-medium px-2 py-0.5', CATEGORY_CONFIG[selectedTicket.category]?.color)}>
                          {CATEGORY_CONFIG[selectedTicket.category]?.label}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-mono text-xs">{format(new Date(selectedTicket.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="font-mono text-xs">{format(new Date(selectedTicket.updatedAt), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                      {selectedTicket.resolvedAt && (
                        <>
                          <Separator />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Resolved</span>
                            <span className="font-mono text-xs">{format(new Date(selectedTicket.resolvedAt), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Resolution Time */}
                  {selectedTicket.resolvedAt && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200/60 dark:border-emerald-800/40">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                          Resolved in {formatDistanceToNow(new Date(selectedTicket.resolvedAt), { addSuffix: false })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Close Ticket Action */}
                  {selectedTicket.status !== 'closed' && (
                    <>
                      <Separator />
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={() => setDeleteDialog({ open: true, ticket: selectedTicket })}
                        >
                          <Archive className="h-4 w-4" />
                          Close Ticket
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete / Close Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, ticket: deleteDialog.ticket })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close ticket <span className="font-mono font-semibold">{deleteDialog.ticket?.ticketNo}</span>?
              This will mark the ticket as closed and set the resolved timestamp. You can still view it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.ticket && deleteMutation.mutate({ id: deleteDialog.ticket.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Close Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
