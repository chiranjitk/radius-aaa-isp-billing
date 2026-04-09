'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Calculator,
  FileText,
  AlertTriangle,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CreditCard,
  Send,
  Play,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Settings2,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  AlertCircle,
  BadgeDollarSign,
  CalendarClock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'

// ─────────────────────── Types ───────────────────────

interface Stats {
  totalSubscriptions: number
  activeSubscriptions: number
  overdueInvoices: number
  autoInvoicesThisMonth: number
  revenueThisMonth: number
  mrr: number
  totalCreditNotes: number
  activeCreditNotes: number
  activeCreditTotal: number
  monthlyRevenue: { month: string; revenue: number }[]
}

interface AutoInvoiceResult {
  generated: number
  totalAmount: number
  errors: { subscription: string; reason: string }[]
  message?: string
  processedAt: string
}

interface GracePeriodResult {
  suspended: number
  warningsSent: number
  reviewed: number
  message?: string
  errors?: { invoice: string; reason: string }[]
  processedAt: string
  mode: string
}

interface CreditNote {
  id: string
  creditNo: string
  username: string
  invoiceId: string | null
  amount: number
  reason: string
  status: string
  usedAmount: number
  expiresAt: string | null
  issuedBy: string | null
  createdAt: string
  user: { id: string; username: string; fullName: string | null; email: string | null }
}

interface InvoiceOption {
  id: string
  invoiceNo: string
  username: string
  total: number
  status: string
}

interface UserOption {
  username: string
  fullName: string | null
}

// ─────────────────────── Chart config ───────────────────────

const chartConfig = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
}

// ─────────────────────── Component ───────────────────────

export function BillingEngineView() {
  const queryClient = useQueryClient()

  // ── Local state ──
  const [advanceDays, setAdvanceDays] = useState('3')
  const [emailInvoice, setEmailInvoice] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCnId, setSelectedCnId] = useState<string | null>(null)
  const [graceResult, setGraceResult] = useState<GracePeriodResult | null>(null)
  const [invoiceResult, setInvoiceResult] = useState<AutoInvoiceResult | null>(null)

  // ── Create credit note form ──
  const [cnForm, setCnForm] = useState({
    username: '',
    amount: '',
    reason: '',
    invoiceId: '',
    expiresAt: '',
  })

  // ─────────────────────── Queries ───────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['billing-engine-stats'],
    queryFn: async () => {
      const res = await fetch('/api/billing-engine/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const { data: creditNotesData, isLoading: cnLoading } = useQuery<{
    creditNotes: CreditNote[]
    total: number
    page: number
    totalPages: number
  }>({
    queryKey: ['billing-engine-credit-notes'],
    queryFn: async () => {
      const res = await fetch('/api/billing-engine/credit-notes?pageSize=50')
      if (!res.ok) throw new Error('Failed to fetch credit notes')
      return res.json()
    },
  })

  // ─────────────────────── Mutations ───────────────────────

  const autoInvoiceMutation = useMutation({
    mutationFn: async (config: { advanceDays: number; emailInvoice: boolean }) => {
      const res = await fetch('/api/billing-engine/auto-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Failed to generate invoices')
      return res.json() as Promise<AutoInvoiceResult>
    },
    onSuccess: (data) => {
      setInvoiceResult(data)
      toast.success(`Generated ${data.generated} invoice(s)`)
      queryClient.invalidateQueries({ queryKey: ['billing-engine-stats'] })
    },
    onError: () => {
      toast.error('Failed to generate invoices')
    },
  })

  const gracePeriodMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await fetch('/api/billing-engine/grace-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      })
      if (!res.ok) throw new Error('Failed to process grace period')
      return res.json() as Promise<GracePeriodResult>
    },
    onSuccess: (data) => {
      setGraceResult(data)
      if (data.mode === 'live') {
        toast.success(`Suspended ${data.suspended} user(s), sent ${data.warningsSent} warning(s)`)
      } else {
        toast.info(`Dry run: would suspend ${data.suspended} user(s)`)
      }
      queryClient.invalidateQueries({ queryKey: ['billing-engine-stats'] })
    },
    onError: () => {
      toast.error('Failed to process grace period')
    },
  })

  const createCnMutation = useMutation({
    mutationFn: async (form: typeof cnForm) => {
      const res = await fetch('/api/billing-engine/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create credit note')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Credit note created')
      setCreateDialogOpen(false)
      setCnForm({ username: '', amount: '', reason: '', invoiceId: '', expiresAt: '' })
      queryClient.invalidateQueries({ queryKey: ['billing-engine-credit-notes'] })
      queryClient.invalidateQueries({ queryKey: ['billing-engine-stats'] })
    },
    onError: () => {
      toast.error('Failed to create credit note')
    },
  })

  const deleteCnMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/billing-engine/credit-notes/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete credit note')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Credit note deleted')
      setDeleteDialogOpen(false)
      setSelectedCnId(null)
      queryClient.invalidateQueries({ queryKey: ['billing-engine-credit-notes'] })
      queryClient.invalidateQueries({ queryKey: ['billing-engine-stats'] })
    },
    onError: () => {
      toast.error('Failed to delete credit note')
    },
  })

  // ─────────────────────── Handlers ───────────────────────

  const handleAutoInvoice = useCallback(() => {
    autoInvoiceMutation.mutate({
      advanceDays: parseInt(advanceDays, 10),
      emailInvoice,
    })
  }, [autoInvoiceMutation, advanceDays, emailInvoice])

  const handleGraceProcess = useCallback(
    (dryRun: boolean) => {
      gracePeriodMutation.mutate(dryRun)
    },
    [gracePeriodMutation]
  )

  const handleCreateCreditNote = useCallback(() => {
    if (!cnForm.username || !cnForm.amount || !cnForm.reason) {
      toast.error('Please fill in all required fields')
      return
    }
    createCnMutation.mutate(cnForm)
  }, [cnForm, createCnMutation])

  const handleDeleteCreditNote = useCallback(() => {
    if (selectedCnId) {
      deleteCnMutation.mutate(selectedCnId)
    }
  }, [selectedCnId, deleteCnMutation])

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // ─────────────────────── Render ───────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            Billing Engine
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Automated billing, invoicing, grace period management, and credit notes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['billing-engine-stats'] })
            queryClient.invalidateQueries({ queryKey: ['billing-engine-credit-notes'] })
            setInvoiceResult(null)
            setGraceResult(null)
            toast.success('Data refreshed')
          }}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-7 w-16" />
              </Card>
            ))
          : [
              {
                label: 'Total Subscriptions',
                value: stats?.totalSubscriptions ?? 0,
                icon: Users,
                color: 'text-slate-600 dark:text-slate-400',
                bg: 'bg-slate-100 dark:bg-slate-800/50',
              },
              {
                label: 'Active',
                value: stats?.activeSubscriptions ?? 0,
                icon: CheckCircle2,
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-900/30',
              },
              {
                label: 'Overdue Invoices',
                value: stats?.overdueInvoices ?? 0,
                icon: AlertTriangle,
                color: 'text-red-600 dark:text-red-400',
                bg: 'bg-red-50 dark:bg-red-900/30',
              },
              {
                label: 'Auto-Invoiced',
                value: stats?.autoInvoicesThisMonth ?? 0,
                icon: FileText,
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-900/30',
              },
              {
                label: 'Revenue (MTD)',
                value: fmtCurrency(stats?.revenueThisMonth ?? 0),
                icon: DollarSign,
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-900/30',
              },
              {
                label: 'MRR',
                value: fmtCurrency(stats?.mrr ?? 0),
                icon: TrendingUp,
                color: 'text-teal-600 dark:text-teal-400',
                bg: 'bg-teal-50 dark:bg-teal-900/30',
              },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <Card
                  key={stat.label}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${stat.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
                  </div>
                  <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                </Card>
              )
            })}
      </div>

      {/* ── Revenue Chart ── */}
      {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Monthly Revenue Trend
            </CardTitle>
            <CardDescription>Revenue collected over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={stats.monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val: number) => `$${val.toLocaleString()}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Auto Invoice + Grace Period (2 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auto-Invoice Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-500" />
              Auto-Invoice Generation
            </CardTitle>
            <CardDescription>
              Generate invoices for active subscriptions nearing next billing date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Configuration */}
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Advance Days</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={advanceDays}
                    onChange={(e) => setAdvanceDays(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Days before due date</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Billing Cycle</Label>
                  <Input value="All Cycles" disabled className="h-8 text-sm" />
                  <p className="text-[10px] text-muted-foreground">All active cycles</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Email Invoice</Label>
                  <p className="text-[10px] text-muted-foreground">Send email to subscribers</p>
                </div>
                <Switch checked={emailInvoice} onCheckedChange={setEmailInvoice} />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              className="w-full"
              onClick={handleAutoInvoice}
              disabled={autoInvoiceMutation.isPending}
            >
              {autoInvoiceMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Invoices
                </>
              )}
            </Button>

            {/* Result Summary */}
            {invoiceResult && (
              <div
                className={`p-3 rounded-lg border ${
                  invoiceResult.generated > 0
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40'
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {invoiceResult.generated > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                  <span className="text-sm font-medium">
                    {invoiceResult.message || `${invoiceResult.generated} Invoice(s) Generated`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Generated:</span>{' '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {invoiceResult.generated}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>{' '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {fmtCurrency(invoiceResult.totalAmount)}
                    </span>
                  </div>
                </div>
                {invoiceResult.errors && invoiceResult.errors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">
                      Errors ({invoiceResult.errors.length}):
                    </p>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {invoiceResult.errors.map((err, i) => (
                        <p key={i} className="text-[10px] text-amber-600 dark:text-amber-500">
                          {err.subscription}: {err.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grace Period Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Grace Period Management
            </CardTitle>
            <CardDescription>
              Review and suspend accounts with overdue invoices past grace period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overdue count preview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[11px] text-muted-foreground font-medium">Overdue</span>
                </div>
                <span className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                  {stats?.overdueInvoices ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] text-muted-foreground font-medium">Active Credits</span>
                </div>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {stats?.activeCreditNotes ?? 0}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleGraceProcess(true)}
                disabled={gracePeriodMutation.isPending}
              >
                {gracePeriodMutation.isPending && gracePeriodMutation.variables === true ? (
                  <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1.5" />
                )}
                Preview
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleGraceProcess(false)}
                disabled={gracePeriodMutation.isPending}
              >
                {gracePeriodMutation.isPending && gracePeriodMutation.variables === false ? (
                  <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <ShieldAlert className="h-4 w-4 mr-1.5" />
                )}
                Process Suspend
              </Button>
            </div>

            {/* Grace Result */}
            {graceResult && (
              <div
                className={`p-3 rounded-lg border ${
                  graceResult.mode === 'live'
                    ? graceResult.suspended > 0
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/40'
                      : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {graceResult.mode === 'dry-run' ? (
                    <FileText className="h-4 w-4 text-slate-500" />
                  ) : graceResult.suspended > 0 ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  <span className="text-sm font-medium">
                    {graceResult.mode === 'dry-run' ? 'Dry Run Results' : 'Processing Complete'}
                    {graceResult.message && ` — ${graceResult.message}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Reviewed:</span>{' '}
                    <span className="font-semibold">{graceResult.reviewed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Suspended:</span>{' '}
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {graceResult.suspended}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Warnings Sent:</span>{' '}
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {graceResult.warningsSent}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mode:</span>{' '}
                    <Badge variant={graceResult.mode === 'live' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                      {graceResult.mode}
                    </Badge>
                  </div>
                </div>
                {graceResult.errors && graceResult.errors.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-[11px] font-medium text-red-600 dark:text-red-400 mb-1">
                      Errors ({graceResult.errors.length}):
                    </p>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {graceResult.errors.map((err, i) => (
                        <p key={i} className="text-[10px] text-red-500">
                          {err.invoice}: {err.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Billing Configuration ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-slate-500" />
            Billing Configuration
          </CardTitle>
          <CardDescription>Configure automated billing engine parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                Auto-Invoice Days Before Due
              </Label>
              <Input defaultValue={advanceDays} readOnly className="h-8 text-sm bg-background" />
              <p className="text-[10px] text-muted-foreground">
                Invoices generated this many days before billing date
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Send className="h-3 w-3 text-muted-foreground" />
                Reminder Schedule
              </Label>
              <Input defaultValue="3, 7, 14 days" readOnly className="h-8 text-sm bg-background" />
              <p className="text-[10px] text-muted-foreground">
                Days after due date to send payment reminders
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <PercentIcon className="h-3 w-3 text-muted-foreground" />
                Late Fee Percentage
              </Label>
              <Input defaultValue="5%" readOnly className="h-8 text-sm bg-background" />
              <p className="text-[10px] text-muted-foreground">
                Applied after grace period ends per plan settings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Credit Notes Section ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-teal-500" />
                Credit Notes
              </CardTitle>
              <CardDescription>
                Manage customer credit notes and adjustments
                {creditNotesData && (
                  <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4">
                    {creditNotesData.total} total
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Credit Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Credit Note</DialogTitle>
                  <DialogDescription>
                    Issue a credit note for a customer. This can be applied to future invoices.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Username *</Label>
                    <Input
                      placeholder="Enter username"
                      value={cnForm.username}
                      onChange={(e) => setCnForm({ ...cnForm, username: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Amount ($) *</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        placeholder="0.00"
                        value={cnForm.amount}
                        onChange={(e) => setCnForm({ ...cnForm, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Expires At</Label>
                      <Input
                        type="date"
                        value={cnForm.expiresAt}
                        onChange={(e) => setCnForm({ ...cnForm, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Reason *</Label>
                    <Textarea
                      placeholder="Reason for credit note..."
                      value={cnForm.reason}
                      onChange={(e) => setCnForm({ ...cnForm, reason: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Linked Invoice ID</Label>
                    <Input
                      placeholder="Optional invoice ID"
                      value={cnForm.invoiceId}
                      onChange={(e) => setCnForm({ ...cnForm, invoiceId: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCreditNote}
                    disabled={createCnMutation.isPending}
                  >
                    {createCnMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1.5" />
                    )}
                    Create Credit Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {cnLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !creditNotesData?.creditNotes?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BadgeDollarSign className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No credit notes yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create a credit note to issue credits to customers
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Credit No</TableHead>
                    <TableHead className="text-xs font-semibold">User</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold">Reason</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Issued</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotesData.creditNotes.map((cn: CreditNote) => (
                    <TableRow key={cn.id} className="group">
                      <TableCell className="font-mono text-xs font-medium">{cn.creditNo}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{cn.username}</span>
                          <span className="text-[10px] text-muted-foreground">{cn.user.fullName || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmtCurrency(cn.amount)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground" title={cn.reason}>
                        {cn.reason}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-5 ${
                            cn.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                              : cn.status === 'used'
                                ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40'
                          }`}
                        >
                          {cn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(cn.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Delete"
                            onClick={() => {
                              setSelectedCnId(cn.id)
                              setDeleteDialogOpen(true)
                            }}
                            disabled={cn.status === 'used'}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Credit Note
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this credit note? This action cannot be undone.
              Credit notes that have been used cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCreditNote}
              disabled={deleteCnMutation.isPending}
            >
              {deleteCnMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Small Percent icon component (since we're avoiding text-only)
function PercentIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="16" r="2" />
      <line x1="17" y1="7" x2="7" y2="17" />
    </svg>
  )
}
