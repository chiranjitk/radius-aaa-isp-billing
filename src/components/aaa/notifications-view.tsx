'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Mail,
  MessageSquare,
  Phone,
  Bell,
  Edit,
  Trash2,
  Eye,
  Send,
  RefreshCw,
  FileText,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Hash,
  Braces,
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
interface NotificationTemplate {
  id: string
  name: string
  type: string
  category: string
  subject: string | null
  body: string
  variables: string | null
  channel: string
  status: string
  createdAt: string
  updatedAt: string
  parsedVariables?: string[]
}

interface NotificationLog {
  id: string
  templateId: string | null
  recipient: string
  type: string
  category: string
  subject: string | null
  body: string | null
  status: string
  error: string | null
  sentVia: string | null
  sentAt: string
  deliveredAt: string | null
  readAt: string | null
  metadata: string | null
}

interface TemplatesResponse {
  templates: NotificationTemplate[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface LogsResponse {
  logs: NotificationLog[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  stats: { sentToday: number; failed: number; deliveryRate: number; total: number }
}

// ─── Config Maps ─────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  email: { label: 'Email', icon: Mail, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-950' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  whatsapp: { label: 'WhatsApp', icon: Phone, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
  push: { label: 'Push', icon: Bell, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950' },
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  welcome: { label: 'Welcome', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' },
  invoice: { label: 'Invoice', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' },
  payment: { label: 'Payment', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25' },
  reminder: { label: 'Reminder', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25' },
  alert: { label: 'Alert', color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25' },
  suspension: { label: 'Suspension', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25' },
  otp: { label: 'OTP', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25' },
  marketing: { label: 'Marketing', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/25' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; className: string }> = {
  sent: { label: 'Sent', icon: Send, color: 'text-sky-600', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'text-emerald-600', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-600', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25' },
  queued: { label: 'Queued', icon: Clock, color: 'text-amber-600', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' },
}

const AVAILABLE_VARIABLES = [
  { key: '{{username}}', label: 'Username', desc: 'User\'s login username' },
  { key: '{{full_name}}', label: 'Full Name', desc: 'User\'s full name' },
  { key: '{{email}}', label: 'Email', desc: 'User\'s email address' },
  { key: '{{invoice_no}}', label: 'Invoice No', desc: 'Invoice number' },
  { key: '{{amount}}', label: 'Amount', desc: 'Payment/invoice amount' },
  { key: '{{due_date}}', label: 'Due Date', desc: 'Payment due date' },
  { key: '{{plan_name}}', label: 'Plan Name', desc: 'Subscription plan name' },
  { key: '{{expiry_date}}', label: 'Expiry Date', desc: 'Account/plan expiry' },
  { key: '{{company_name}}', label: 'Company', desc: 'ISP company name' },
  { key: '{{otp_code}}', label: 'OTP Code', desc: 'One-time password code' },
  { key: '{{support_url}}', label: 'Support URL', desc: 'Support portal link' },
  { key: '{{balance}}', label: 'Balance', desc: 'Account wallet balance' },
]

// ─── Default Form ────────────────────────────────────────────────────
function getDefaultForm() {
  return {
    name: '',
    type: 'email',
    category: 'welcome',
    subject: '',
    body: '',
    variables: [] as string[],
    channel: 'smtp',
    status: 'active',
  }
}

// ─── Component ───────────────────────────────────────────────────────
export function NotificationsView() {
  const queryClient = useQueryClient()

  // Tabs
  const [activeTab, setActiveTab] = useState('templates')

  // Template state
  const [tplSearch, setTplSearch] = useState('')
  const [tplTypeFilter, setTplTypeFilter] = useState('all')
  const [tplCategoryFilter, setTplCategoryFilter] = useState('all')
  const [tplStatusFilter, setTplStatusFilter] = useState('all')
  const [tplPage, setTplPage] = useState(1)

  // Template dialog state
  const [tplDialogOpen, setTplDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [tplForm, setTplForm] = useState(getDefaultForm())
  const [tplDeleteDialogOpen, setTplDeleteDialogOpen] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<NotificationTemplate | null>(null)

  // Log state
  const [logSearch, setLogSearch] = useState('')
  const [logTypeFilter, setLogTypeFilter] = useState('all')
  const [logCategoryFilter, setLogCategoryFilter] = useState('all')
  const [logStatusFilter, setLogStatusFilter] = useState('all')
  const [logDateFrom, setLogDateFrom] = useState('')
  const [logDateTo, setLogDateTo] = useState('')
  const [logPage, setLogPage] = useState(1)
  const [selectedFailedIds, setSelectedFailedIds] = useState<string[]>([])

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: tplData, isLoading: tplLoading } = useQuery<TemplatesResponse>({
    queryKey: ['notification-templates', tplSearch, tplTypeFilter, tplCategoryFilter, tplStatusFilter, tplPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (tplSearch) params.set('search', tplSearch)
      if (tplTypeFilter !== 'all') params.set('type', tplTypeFilter)
      if (tplCategoryFilter !== 'all') params.set('category', tplCategoryFilter)
      if (tplStatusFilter !== 'all') params.set('status', tplStatusFilter)
      params.set('page', String(tplPage))
      params.set('limit', '20')
      const res = await fetch(`/api/notifications-templates?${params}`)
      if (!res.ok) throw new Error('Failed to fetch templates')
      return res.json()
    },
    enabled: activeTab === 'templates',
  })

  const { data: logData, isLoading: logLoading } = useQuery<LogsResponse>({
    queryKey: ['notification-logs', logSearch, logTypeFilter, logCategoryFilter, logStatusFilter, logDateFrom, logDateTo, logPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (logSearch) params.set('search', logSearch)
      if (logTypeFilter !== 'all') params.set('type', logTypeFilter)
      if (logCategoryFilter !== 'all') params.set('category', logCategoryFilter)
      if (logStatusFilter !== 'all') params.set('status', logStatusFilter)
      if (logDateFrom) params.set('dateFrom', logDateFrom)
      if (logDateTo) params.set('dateTo', logDateTo)
      params.set('page', String(logPage))
      params.set('limit', '20')
      const res = await fetch(`/api/notification-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      return res.json()
    },
    enabled: activeTab === 'logs',
  })

  // ─── Mutations ───────────────────────────────────────────────────
  const createTplMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/notifications-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create template')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      toast.success('Template created successfully')
      closeTplDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateTplMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/notifications-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update template')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      toast.success('Template updated successfully')
      closeTplDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteTplMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete template')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
      toast.success('Template deleted successfully')
      setTplDeleteDialogOpen(false)
      setDeletingTemplate(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const resendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/notification-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to resend notifications')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] })
      toast.success(data.message || `${data.resent} notifications queued for resend`)
      setSelectedFailedIds([])
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  function openCreateTpl() {
    setEditingTemplate(null)
    setTplForm(getDefaultForm())
    setTplDialogOpen(true)
  }

  function openEditTpl(template: NotificationTemplate) {
    setEditingTemplate(template)
    setTplForm({
      name: template.name,
      type: template.type,
      category: template.category,
      subject: template.subject || '',
      body: template.body,
      variables: template.parsedVariables || [],
      channel: template.channel,
      status: template.status,
    })
    setTplDialogOpen(true)
  }

  function closeTplDialog() {
    setTplDialogOpen(false)
    setEditingTemplate(null)
    setTplForm(getDefaultForm())
  }

  function handleTplSubmit() {
    if (!tplForm.name.trim() || !tplForm.body.trim()) {
      toast.error('Template name and body are required')
      return
    }

    // Auto-detect variables from body and subject
    const varRegex = /\{\{(\w+)\}\}/g
    const detectedVars = new Set<string>()
    let match
    const combinedText = tplForm.subject + ' ' + tplForm.body
    while ((match = varRegex.exec(combinedText)) !== null) {
      detectedVars.add(`{{${match[1]}}}`)
    }

    const payload = {
      name: tplForm.name.trim(),
      type: tplForm.type,
      category: tplForm.category,
      subject: tplForm.type === 'email' ? tplForm.subject.trim() || null : null,
      body: tplForm.body.trim(),
      variables: Array.from(detectedVars),
      channel: tplForm.channel,
      status: tplForm.status,
    }

    if (editingTemplate) {
      updateTplMutation.mutate({ id: editingTemplate.id, data: payload })
    } else {
      createTplMutation.mutate(payload)
    }
  }

  function insertVariable(variable: string) {
    const textarea = document.getElementById('tpl-body') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newBody = tplForm.body.substring(0, start) + variable + tplForm.body.substring(end)
      setTplForm({ ...tplForm, body: newBody })
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    } else {
      setTplForm({ ...tplForm, body: tplForm.body + variable })
    }
  }

  function handleResendFailed() {
    if (selectedFailedIds.length === 0) {
      toast.error('No failed notifications selected')
      return
    }
    resendMutation.mutate(selectedFailedIds)
  }

  function toggleFailedSelection(id: string, isFailed: boolean) {
    if (!isFailed) return
    setSelectedFailedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const isSubmitting = createTplMutation.isPending || updateTplMutation.isPending

  // Count detected variables
  const detectedVars = useMemo(() => {
    const varRegex = /\{\{(\w+)\}\}/g
    const detected = new Set<string>()
    let match
    const combinedText = tplForm.subject + ' ' + tplForm.body
    while ((match = varRegex.exec(combinedText)) !== null) {
      detected.add(`{{${match[1]}}}`)
    }
    return Array.from(detected)
  }, [tplForm.subject, tplForm.body])

  const failedLogs = logData?.logs?.filter((l) => l.status === 'failed') || []
  const allFailedSelected = failedLogs.length > 0 && failedLogs.every((l) => selectedFailedIds.includes(l.id))

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-transition">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {activeTab === 'templates' ? 'Total Templates' : 'Total Sent'}
                </p>
                {activeTab === 'templates' ? (
                  tplLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold stat-number">{tplData?.pagination?.total ?? 0}</p>
                  )
                ) : (
                  logLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold stat-number">{logData?.stats?.total ?? 0}</p>
                  )
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent Today</p>
                {logLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold stat-number text-emerald-600">{logData?.stats?.sentToday ?? 0}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <Send className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Rate</p>
                {logLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold stat-number">{logData?.stats?.deliveryRate ?? 0}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</p>
                {logLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className={cn('text-2xl font-bold stat-number', (logData?.stats?.failed ?? 0) > 0 ? 'text-red-600' : '')}>
                    {logData?.stats?.failed ?? 0}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Send className="h-4 w-4" />
            Notification Logs
            {logData && logData.stats.failed > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{logData.stats.failed}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── TEMPLATES TAB ─────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          {/* Filters + Action */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Card className="card-hover flex-1 min-w-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={tplSearch}
                      onChange={(e) => { setTplSearch(e.target.value); setTplPage(1) }}
                      className="pl-9"
                    />
                  </div>
                  <Select value={tplTypeFilter} onValueChange={(v) => { setTplTypeFilter(v); setTplPage(1) }}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={tplCategoryFilter} onValueChange={(v) => { setTplCategoryFilter(v); setTplPage(1) }}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="welcome">Welcome</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="suspension">Suspension</SelectItem>
                      <SelectItem value="otp">OTP</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={tplStatusFilter} onValueChange={(v) => { setTplStatusFilter(v); setTplPage(1) }}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Button size="sm" onClick={openCreateTpl}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>

          {/* Templates Table */}
          <Card>
            <CardContent className="p-0">
              {tplLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : !tplData?.templates?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No templates found</p>
                  <p className="text-xs mt-1">Create your first notification template</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Template</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell">Category</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell">Channel</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell">Variables</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tplData.templates.map((template) => {
                        const typeConf = TYPE_CONFIG[template.type]
                        const catConf = CATEGORY_CONFIG[template.category]
                        const TypeIcon = typeConf?.icon || FileText
                        const vars: string[] = []
                        if (template.variables) {
                          try { JSON.parse(template.variables).forEach((v: string) => vars.push(v)) } catch { /* ignore */ }
                        }
                        return (
                          <TableRow key={template.id} className="group">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', typeConf?.bg)}>
                                  <TypeIcon className={cn('h-4 w-4', typeConf?.color)} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{template.name}</p>
                                  {template.subject && (
                                    <p className="text-[10px] text-muted-foreground truncate">{template.subject}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] gap-1', typeConf?.bg, typeConf?.color, 'border-0')}>
                                <TypeIcon className="h-2.5 w-2.5" />
                                {typeConf?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className={cn('text-[10px]', catConf?.color)}>
                                {catConf?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-xs text-muted-foreground capitalize">{template.channel.replace(/_/g, ' ')}</span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1 flex-wrap">
                                {vars.slice(0, 3).map((v) => (
                                  <Badge key={v} variant="secondary" className="text-[9px] px-1.5 h-4 font-mono">
                                    {v}
                                  </Badge>
                                ))}
                                {vars.length > 3 && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 h-4">
                                    +{vars.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                'text-[10px]',
                                template.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25'
                              )}>
                                {template.status === 'active' ? 'Active' : 'Disabled'}
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
                                  <DropdownMenuItem onClick={() => openEditTpl(template)} className="gap-2">
                                    <Edit className="h-3.5 w-3.5" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setDeletingTemplate(template); setTplDeleteDialogOpen(true) }} className="gap-2 text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {tplData?.pagination && tplData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={tplPage <= 1} onClick={() => setTplPage(tplPage - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {tplData.pagination.page} of {tplData.pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={tplPage >= tplData.pagination.totalPages} onClick={() => setTplPage(tplPage + 1)}>Next</Button>
            </div>
          )}
        </TabsContent>

        {/* ─── LOGS TAB ─────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters + Actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Card className="card-hover flex-1 min-w-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={logSearch}
                      onChange={(e) => { setLogSearch(e.target.value); setLogPage(1) }}
                      className="pl-9"
                    />
                  </div>
                  <Select value={logTypeFilter} onValueChange={(v) => { setLogTypeFilter(v); setLogPage(1) }}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={logCategoryFilter} onValueChange={(v) => { setLogCategoryFilter(v); setLogPage(1) }}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="welcome">Welcome</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="suspension">Suspension</SelectItem>
                      <SelectItem value="otp">OTP</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={logStatusFilter} onValueChange={(v) => { setLogStatusFilter(v); setLogPage(1) }}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">From</Label>
                    <Input type="date" value={logDateFrom} onChange={(e) => { setLogDateFrom(e.target.value); setLogPage(1) }} className="w-32 h-9 text-xs" />
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">To</Label>
                    <Input type="date" value={logDateTo} onChange={(e) => { setLogDateTo(e.target.value); setLogPage(1) }} className="w-32 h-9 text-xs" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResendFailed}
              disabled={selectedFailedIds.length === 0 || resendMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', resendMutation.isPending && 'animate-spin')} />
              Resend Failed ({selectedFailedIds.length})
            </Button>
          </div>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              {logLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : !logData?.logs?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Send className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No notification logs found</p>
                  <p className="text-xs mt-1">Logs will appear here when notifications are sent</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10">
                          {failedLogs.length > 0 && (
                            <input
                              type="checkbox"
                              checked={allFailedSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFailedIds(failedLogs.map((l) => l.id))
                                } else {
                                  setSelectedFailedIds([])
                                }
                              }}
                              className="rounded"
                            />
                          )}
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Recipient</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell">Category</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell">Sent At</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell">Delivery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logData.logs.map((log) => {
                        const typeConf = TYPE_CONFIG[log.type]
                        const statusConf = STATUS_CONFIG[log.status]
                        const catConf = CATEGORY_CONFIG[log.category]
                        const TypeIcon = typeConf?.icon || Mail
                        const StatusIcon = statusConf?.icon || Clock
                        const isFailed = log.status === 'failed'

                        return (
                          <TableRow
                            key={log.id}
                            className={cn('group', isFailed && 'bg-red-50/50 dark:bg-red-950/20')}
                          >
                            <TableCell>
                              {isFailed && (
                                <input
                                  type="checkbox"
                                  checked={selectedFailedIds.includes(log.id)}
                                  onChange={() => toggleFailedSelection(log.id, true)}
                                  className="rounded"
                                />
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{log.recipient}</p>
                                {log.subject && (
                                  <p className="text-[10px] text-muted-foreground truncate">{log.subject}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] gap-1', typeConf?.bg, typeConf?.color, 'border-0')}>
                                <TypeIcon className="h-2.5 w-2.5" />
                                {typeConf?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className={cn('text-[10px]', catConf?.color)}>
                                {catConf?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-[10px] gap-1', statusConf?.className)}>
                                <StatusIcon className="h-2.5 w-2.5" />
                                {statusConf?.label}
                              </Badge>
                              {isFailed && log.error && (
                                <p className="text-[10px] text-red-500 mt-0.5 line-clamp-1 max-w-[200px]" title={log.error}>
                                  {log.error}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.sentAt).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-xs text-muted-foreground">
                                {log.deliveredAt ? (
                                  <span className="text-emerald-600">
                                    {new Date(log.deliveredAt).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Pending</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {logData?.pagination && logData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={logPage <= 1} onClick={() => setLogPage(logPage - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {logData.pagination.page} of {logData.pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={logPage >= logData.pagination.totalPages} onClick={() => setLogPage(logPage + 1)}>Next</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Dialog */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update notification template content' : 'Create a new notification template with variable support'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Template Name *</Label>
                <Input
                  id="tpl-name"
                  value={tplForm.name}
                  onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                  placeholder="e.g. Payment Confirmation"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="tpl-type">Type *</Label>
                  <Select value={tplForm.type} onValueChange={(v) => setTplForm({ ...tplForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-status">Status</Label>
                  <Select value={tplForm.status} onValueChange={(v) => setTplForm({ ...tplForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tpl-category">Category *</Label>
                <Select value={tplForm.category} onValueChange={(v) => setTplForm({ ...tplForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="otp">OTP</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-channel">Channel</Label>
                <Select value={tplForm.channel} onValueChange={(v) => setTplForm({ ...tplForm, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="msg91">MSG91</SelectItem>
                    <SelectItem value="whatsapp_business">WhatsApp Business</SelectItem>
                    <SelectItem value="push">Push Gateway</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject (email only) */}
            {tplForm.type === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="tpl-subject">Email Subject</Label>
                <Input
                  id="tpl-subject"
                  value={tplForm.subject}
                  onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })}
                  placeholder="e.g. Your invoice #{{invoice_no}} is ready"
                />
              </div>
            )}

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tpl-body">Template Body *</Label>
                <span className="text-[10px] text-muted-foreground">
                  {detectedVars.length} variable{detectedVars.length !== 1 ? 's' : ''} detected
                </span>
              </div>
              <Textarea
                id="tpl-body"
                value={tplForm.body}
                onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })}
                placeholder="Hello {{full_name}}, your payment of {{amount}} has been received."
                rows={8}
                className="font-mono text-xs"
              />
              {detectedVars.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  {detectedVars.map((v) => (
                    <Badge key={v} variant="secondary" className="text-[9px] font-mono px-1.5 h-4">
                      {v}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Variable Insertion */}
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Braces className="h-3.5 w-3.5" />
                Insert Variable
              </Label>
              <ScrollArea className="max-h-40">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <Button
                      key={v.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto py-1.5 px-2 justify-start text-left gap-1.5"
                      onClick={() => insertVariable(v.key)}
                    >
                      <code className="text-[10px] font-mono text-primary font-semibold">{v.key}</code>
                      <span className="text-[9px] text-muted-foreground hidden sm:inline">{v.label}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTplDialog}>Cancel</Button>
            <Button onClick={handleTplSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={tplDeleteDialogOpen} onOpenChange={setTplDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <strong>{deletingTemplate?.name}</strong> template?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTemplate && deleteTplMutation.mutate(deletingTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
