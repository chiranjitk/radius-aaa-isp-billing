'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Webhook,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Activity,
  AlertTriangle,
  Eye,
  Loader2,
  Zap,
  ChevronRight,
  ArrowLeft,
  Globe,
  Shield,
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
import { ScrollArea } from '@/components/ui/scroll-area'
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

interface WebhookItem {
  id: string
  name: string
  url: string
  secret: string
  events: string
  status: string
  lastTriggered: string | null
  successCount: number
  failureCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

interface WebhookStats {
  total: number
  active: number
  deliveries: number
  successRate: number
}

interface DeliveryLog {
  id: string
  webhookId: string
  eventId: string
  eventType: string
  payload: string
  responseCode: number | null
  responseBody: string | null
  status: string
  attempts: number
  nextRetry: string | null
  duration: number | null
  createdAt: string
}

const ALL_EVENTS = [
  'user.created',
  'user.suspended',
  'invoice.paid',
  'invoice.overdue',
  'payment.received',
  'session.start',
  'session.stop',
  'nas.down',
  'ticket.created',
  'ticket.resolved',
]

const EVENT_LABELS: Record<string, string> = {
  'user.created': 'User Created',
  'user.suspended': 'User Suspended',
  'invoice.paid': 'Invoice Paid',
  'invoice.overdue': 'Invoice Overdue',
  'payment.received': 'Payment Received',
  'session.start': 'Session Start',
  'session.stop': 'Session Stop',
  'nas.down': 'NAS Down',
  'ticket.created': 'Ticket Created',
  'ticket.resolved': 'Ticket Resolved',
}

const EVENT_COLORS: Record<string, string> = {
  'user.created': 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
  'user.suspended': 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400',
  'invoice.paid': 'bg-teal-500/15 text-teal-600 border-teal-500/25 dark:text-teal-400',
  'invoice.overdue': 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400',
  'payment.received': 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
  'session.start': 'bg-cyan-500/15 text-cyan-600 border-cyan-500/25 dark:text-cyan-400',
  'session.stop': 'bg-slate-500/15 text-slate-600 border-slate-500/25',
  'nas.down': 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400',
  'ticket.created': 'bg-violet-500/15 text-violet-600 border-violet-500/25 dark:text-violet-400',
  'ticket.resolved': 'bg-teal-500/15 text-teal-600 border-teal-500/25 dark:text-teal-400',
}

interface WebhookFormData {
  name: string
  url: string
  secret: string
  events: string[]
  status: string
}

const emptyForm: WebhookFormData = {
  name: '',
  url: '',
  secret: '',
  events: [],
  status: 'active',
}

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'whsec_'
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function parseEvents(eventsJson: string): string[] {
  try {
    return JSON.parse(eventsJson)
  } catch {
    return []
  }
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
        Active
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 bg-slate-500/15 text-slate-600 border-slate-500/25">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500 mr-1" />
      Disabled
    </Badge>
  )
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    success: { cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400', icon: CheckCircle2, label: 'Success' },
    failed: { cls: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400', icon: XCircle, label: 'Failed' },
    pending: { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400', icon: Clock, label: 'Pending' },
  }
  const c = config[status] || config.pending
  const Icon = c.icon
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5 gap-1', c.cls)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  )
}

function EventBadge({ event }: { event: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-medium px-1.5 py-0', EVENT_COLORS[event] || 'bg-muted text-muted-foreground')}
    >
      {EVENT_LABELS[event] || event}
    </Badge>
  )
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function WebhooksView() {
  const queryClient = useQueryClient()

  // UI State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookItem | null>(null)
  const [formData, setFormData] = useState<WebhookFormData>(emptyForm)
  const [deliveryPage, setDeliveryPage] = useState(1)
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('')

  // ==========================================
  // QUERIES
  // ==========================================

  const { data, isLoading, isError } = useQuery<{
    webhooks: WebhookItem[]
    pagination: { page: number; limit: number; total: number; pages: number }
    stats: WebhookStats
  }>({
    queryKey: ['webhooks', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '50')
      const res = await fetch(`/api/webhooks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch webhooks')
      return res.json()
    },
    staleTime: 30000,
  })

  const { data: deliveryData, isLoading: deliveryLoading } = useQuery<{
    deliveries: DeliveryLog[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>({
    queryKey: ['webhook-deliveries', selectedWebhook?.id, deliveryPage, deliveryStatusFilter],
    queryFn: async () => {
      if (!selectedWebhook) return { deliveries: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } }
      const params = new URLSearchParams()
      if (deliveryStatusFilter) params.set('status', deliveryStatusFilter)
      params.set('page', deliveryPage.toString())
      params.set('limit', '20')
      const res = await fetch(`/api/webhooks/${selectedWebhook.id}/deliveries?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch deliveries')
      return res.json()
    },
    enabled: !!selectedWebhook && deliveryDialogOpen,
    staleTime: 15000,
  })

  const stats = data?.stats

  // ==========================================
  // MUTATIONS
  // ==========================================

  const createMutation = useMutation({
    mutationFn: async (data: WebhookFormData) => {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create webhook')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook created successfully')
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setCreateDialogOpen(false)
      setFormData(emptyForm)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WebhookFormData> }) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update webhook')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook updated')
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setEditDialogOpen(false)
      setSelectedWebhook(null)
      setFormData(emptyForm)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete webhook')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook deleted')
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setDeleteDialogOpen(false)
      setSelectedWebhook(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.events.length === 0) {
      toast.error('Select at least one event')
      return
    }
    createMutation.mutate(formData)
  }

  const handleEdit = (webhook: WebhookItem) => {
    setSelectedWebhook(webhook)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret,
      events: parseEvents(webhook.events),
      status: webhook.status,
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWebhook) return
    updateMutation.mutate({
      id: selectedWebhook.id,
      data: {
        name: formData.name,
        url: formData.url,
        events: formData.events,
        status: formData.status,
      },
    })
  }

  const handleToggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  const handleToggleStatus = (webhook: WebhookItem) => {
    const newStatus = webhook.status === 'active' ? 'disabled' : 'active'
    updateMutation.mutate({
      id: webhook.id,
      data: { status: newStatus },
    })
  }

  const handleViewDeliveries = (webhook: WebhookItem) => {
    setSelectedWebhook(webhook)
    setDeliveryPage(1)
    setDeliveryStatusFilter('')
    setDeliveryDialogOpen(true)
  }

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copied to clipboard')
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={() => { setFormData({ ...emptyForm, secret: generateSecret() }); setCreateDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        </div>

        {/* Stats Row */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Webhook className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold stat-number">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Webhooks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
                    <Zap className="h-5 w-5 text-emerald-600" />
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
                    <Send className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-600 stat-number">{stats.deliveries}</p>
                    <p className="text-xs text-muted-foreground">Deliveries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-teal-500/10">
                    <Activity className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold stat-number">{stats.successRate}%</p>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
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
                  placeholder="Search by name or URL..."
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
                    <SelectItem value="disabled">Disabled</SelectItem>
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
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <div className="ml-auto flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : isError ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">Failed to load webhooks</h3>
              <p className="text-sm text-muted-foreground mb-4">There was an error fetching webhooks.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['webhooks'] })}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.webhooks.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No webhooks configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || statusFilter ? 'Try adjusting your filters.' : 'Create your first webhook to receive real-time event notifications.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(search || statusFilter) && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('') }}>
                    Clear Filters
                  </Button>
                )}
                <Button size="sm" onClick={() => { setFormData({ ...emptyForm, secret: generateSecret() }); setCreateDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
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
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">URL</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Events</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-3 font-medium text-muted-foreground hidden md:table-cell">Success / Fail</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Last Triggered</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.webhooks.map((wh) => {
                    const events = parseEvents(wh.events)
                    const total = wh.successCount + wh.failureCount
                    return (
                      <tr key={wh.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                              <Webhook className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{wh.name}</p>
                              <p className="text-[11px] text-muted-foreground md:hidden">{wh.url}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground font-mono truncate max-w-[250px] cursor-default">{wh.url}</p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[400px] break-all">{wh.url}</TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {events.slice(0, 3).map((ev) => (
                              <EventBadge key={ev} event={ev} />
                            ))}
                            {events.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{events.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={wh.status} />
                        </td>
                        <td className="p-3 text-center hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-medium text-emerald-600">{wh.successCount}</span>
                            <span className="text-xs text-muted-foreground">/</span>
                            <span className="text-xs font-medium text-red-600">{wh.failureCount}</span>
                          </div>
                        </td>
                        <td className="p-3 hidden xl:table-cell">
                          <span className="text-xs text-muted-foreground">{formatRelativeDate(wh.lastTriggered)}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDeliveries(wh)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Deliveries</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleStatus(wh)}>
                                  {wh.status === 'active' ? (
                                    <XCircle className="h-3.5 w-3.5 text-amber-500" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{wh.status === 'active' ? 'Disable' : 'Enable'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(wh)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelectedWebhook(wh); setDeleteDialogOpen(true) }}>
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

        {/* Create Webhook Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => !open && setCreateDialogOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Create Webhook
              </DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive real-time event notifications.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wh-name">Name</Label>
                <Input
                  id="wh-name"
                  placeholder="e.g. Slack Notifications"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wh-url">Endpoint URL</Label>
                <Input
                  id="wh-url"
                  placeholder="https://example.com/webhook"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wh-secret" className="flex items-center gap-2">
                  Signing Secret
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setFormData({ ...formData, secret: generateSecret() })}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="wh-secret"
                    placeholder="Auto-generated secret"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => handleCopySecret(formData.secret)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy Secret</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Events</Label>
                <p className="text-xs text-muted-foreground">Select which events should trigger this webhook.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2 rounded-md border border-border/40 p-2.5 hover:bg-muted/30 transition-colors">
                      <Checkbox
                        id={`event-${event}`}
                        checked={formData.events.includes(event)}
                        onCheckedChange={() => handleToggleEvent(event)}
                      />
                      <Label htmlFor={`event-${event}`} className="text-xs cursor-pointer flex-1">
                        {EVENT_LABELS[event]}
                      </Label>
                      <EventBadge event={event} />
                    </div>
                  ))}
                </div>
                {formData.events.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.events.length} event{formData.events.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <Separator />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Webhook
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Webhook Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit Webhook
              </DialogTitle>
              <DialogDescription>Update webhook configuration.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-wh-name">Name</Label>
                <Input
                  id="edit-wh-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-wh-url">Endpoint URL</Label>
                <Input
                  id="edit-wh-url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Events</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2 rounded-md border border-border/40 p-2.5 hover:bg-muted/30 transition-colors">
                      <Checkbox
                        id={`edit-event-${event}`}
                        checked={formData.events.includes(event)}
                        onCheckedChange={() => handleToggleEvent(event)}
                      />
                      <Label htmlFor={`edit-event-${event}`} className="text-xs cursor-pointer flex-1">
                        {EVENT_LABELS[event]}
                      </Label>
                      <EventBadge event={event} />
                    </div>
                  ))}
                </div>
              </div>

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

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete webhook <strong>{selectedWebhook?.name}</strong>?
                All delivery logs will also be permanently removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedWebhook && deleteMutation.mutate(selectedWebhook.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delivery Logs Dialog */}
        <Dialog open={deliveryDialogOpen} onOpenChange={(open) => !open && setDeliveryDialogOpen(false)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Delivery Logs
              </DialogTitle>
              <DialogDescription>
                {selectedWebhook?.name} — {selectedWebhook?.url}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Select value={deliveryStatusFilter || 'all'} onValueChange={(v) => { setDeliveryStatusFilter(v === 'all' ? '' : v); setDeliveryPage(1) }}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {deliveryLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : !deliveryData?.deliveries.length ? (
              <div className="text-center py-8">
                <Send className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No delivery logs found.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {deliveryData.deliveries.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors">
                      <DeliveryStatusBadge status={d.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{EVENT_LABELS[d.eventType] || d.eventType}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">
                            {d.responseCode ? `${d.responseCode}` : '—'}
                          </span>
                          {d.duration !== null && d.duration > 0 && (
                            <span className="text-[11px] text-muted-foreground">{d.duration}ms</span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {d.attempts} attempt{d.attempts !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeDate(d.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {deliveryData?.pagination && deliveryData.pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={deliveryPage <= 1} onClick={() => setDeliveryPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  Page {deliveryData.pagination.page} of {deliveryData.pagination.pages}
                </span>
                <Button variant="outline" size="sm" disabled={deliveryPage >= deliveryData.pagination.pages} onClick={() => setDeliveryPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
