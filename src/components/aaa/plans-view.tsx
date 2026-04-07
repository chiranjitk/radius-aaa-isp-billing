'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Clock,
  Database,
  Infinity,
  Layers,
  ArrowDown,
  ArrowUp,
  Users,
  Edit,
  Trash2,
  ShieldCheck,
  Eye,
  Star,
  Zap,
  Timer,
  HardDrive,
  Gauge,
  X,
  GitCompareArrows,
  Crown,
  Check,
  Download,
  FileSpreadsheet,
  FileJson,
  DollarSign,
  Sparkles,
  TrendingUp,
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'

// ─── Types ───────────────────────────────────────────────────────────
interface Plan {
  id: string
  name: string
  description: string | null
  planType: string
  billingCycle: string
  price: number
  currency: string
  dataLimit: number | null
  timeLimit: number | null
  speedDown: number | null
  speedUp: number | null
  simultaneous: number
  priority: number
  status: string
  isActive: boolean
  trialDays: number
  gracePeriodDays: number
  createdAt: string
  updatedAt: string
  _count: { subscriptions: number; policyGroups: number }
}

interface Policy {
  id: string
  name: string
  type: string
  status: string
}

interface PlansResponse {
  plans: Plan[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  typeCounts: Record<string, number>
}

interface PlanTemplate {
  name: string
  description: string
  planType: string
  billingCycle: string
  price: string
  currency: string
  speedDown: string
  speedUp: string
  dataLimit: string
  timeLimit: string
  simultaneous: string
  priority: string
  trialDays: string
  gracePeriodDays: string
}

// ─── Formatters ──────────────────────────────────────────────────────
function formatSpeed(kbps: number | null | undefined): string {
  if (!kbps) return 'Unlimited'
  if (kbps >= 1000000) return `${(kbps / 1000000).toFixed(kbps % 1000000 === 0 ? 0 : 1)} Gbps`
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(kbps % 1000 === 0 ? 0 : 1)} Mbps`
  return `${kbps} Kbps`
}

function formatData(mb: number | null | undefined): string {
  if (mb === null || mb === undefined || mb === 0) return 'Unlimited'
  if (mb >= 1048576) return `${(mb / 1048576).toFixed(mb % 1048576 === 0 ? 0 : 1)} TB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
  return `${mb} MB`
}

function formatPrice(price: number, currency: string, cycle: string): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5' }
  const sym = symbols[currency] || currency
  if (price === 0) return 'Free'
  const cycleLabels: Record<string, string> = { daily: 'day', weekly: 'wk', monthly: 'mo', yearly: 'yr' }
  return `${sym}${price.toFixed(2)}/${cycleLabels[cycle] || cycle}`
}

function formatTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes === 0) return 'Unlimited'
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440)
    const hrs = (minutes % 1440) / 60
    return hrs > 0 ? `${days}d ${hrs}h` : `${days} days`
  }
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
  if (hrs > 0) return `${hrs} hours`
  return `${mins} min`
}

const PLAN_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; badgeColor: string }> = {
  'time-based': { label: 'Time-Based', icon: Clock, color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950', badgeColor: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25' },
  'data-based': { label: 'Data-Based', icon: Database, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950', badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' },
  'flat-rate': { label: 'Flat-Rate', icon: Infinity, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' },
  hybrid: { label: 'Hybrid', icon: Layers, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950', badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25' },
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  disabled: 'destructive',
  archived: 'secondary',
}

// ─── Plan Templates ──────────────────────────────────────────────────
const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    name: 'Basic 512Kbps',
    description: 'Entry-level plan for light browsing and email',
    planType: 'flat-rate', billingCycle: 'monthly', price: '9.99', currency: 'USD',
    speedDown: '512', speedUp: '256', dataLimit: '1024', timeLimit: '',
    simultaneous: '1', priority: '1', trialDays: '3', gracePeriodDays: '3',
  },
  {
    name: 'Standard 2Mbps',
    description: 'Good for streaming and video calls',
    planType: 'flat-rate', billingCycle: 'monthly', price: '29.99', currency: 'USD',
    speedDown: '2048', speedUp: '1024', dataLimit: '5120', timeLimit: '',
    simultaneous: '2', priority: '5', trialDays: '7', gracePeriodDays: '5',
  },
  {
    name: 'Premium 10Mbps',
    description: 'Fast plan for power users and families',
    planType: 'flat-rate', billingCycle: 'monthly', price: '59.99', currency: 'USD',
    speedDown: '10240', speedUp: '5120', dataLimit: '51200', timeLimit: '',
    simultaneous: '3', priority: '8', trialDays: '7', gracePeriodDays: '7',
  },
  {
    name: 'Enterprise 100Mbps',
    description: 'Business-grade connectivity with SLA',
    planType: 'flat-rate', billingCycle: 'monthly', price: '199.99', currency: 'USD',
    speedDown: '102400', speedUp: '51200', dataLimit: '', timeLimit: '',
    simultaneous: '10', priority: '10', trialDays: '14', gracePeriodDays: '14',
  },
  {
    name: 'Unlimited',
    description: 'No limits on speed or data usage',
    planType: 'flat-rate', billingCycle: 'monthly', price: '99.99', currency: 'USD',
    speedDown: '', speedUp: '', dataLimit: '', timeLimit: '',
    simultaneous: '5', priority: '10', trialDays: '7', gracePeriodDays: '7',
  },
]

// ─── Default form state ──────────────────────────────────────────────
function getDefaultForm() {
  return {
    name: '',
    description: '',
    planType: 'flat-rate',
    billingCycle: 'monthly',
    price: '0',
    currency: 'USD',
    dataLimit: '',
    dataLimitUnit: 'MB',
    timeLimit: '',
    speedDown: '',
    speedUp: '',
    simultaneous: '1',
    priority: '0',
    trialDays: '0',
    gracePeriodDays: '0',
    isActive: true,
    policyIds: [] as string[],
  }
}

// ─── Comparison helpers ──────────────────────────────────────────────
function getBestPlanId(plans: Plan[], feature: string): string | null {
  if (plans.length < 2) return null
  if (feature === 'price') {
    const nonFree = plans.filter(p => p.price > 0)
    if (nonFree.length < 2) return null
    return nonFree.reduce((best, p) => p.price < best.price ? p : best).id
  }
  if (feature === 'download') {
    const withSpeed = plans.filter(p => p.speedDown != null && p.speedDown > 0)
    if (withSpeed.length < 2) return null
    return withSpeed.reduce((best, p) => (p.speedDown ?? 0) > (best.speedDown ?? 0) ? p : best).id
  }
  if (feature === 'upload') {
    const withSpeed = plans.filter(p => p.speedUp != null && p.speedUp > 0)
    if (withSpeed.length < 2) return null
    return withSpeed.reduce((best, p) => (p.speedUp ?? 0) > (best.speedUp ?? 0) ? p : best).id
  }
  if (feature === 'data') {
    const withData = plans.filter(p => p.dataLimit != null && p.dataLimit > 0)
    if (withData.length < 2) return null
    return withData.reduce((best, p) => (p.dataLimit ?? 0) > (best.dataLimit ?? 0) ? p : best).id
  }
  return null
}

// ─── Simulated Revenue ───────────────────────────────────────────────
function simulateRevenue(plan: Plan): string {
  const subCount = plan._count.subscriptions
  const multipliers: Record<string, number> = { daily: 30, weekly: 4.33, monthly: 1, yearly: 1 / 12 }
  const rev = plan.price * subCount * (multipliers[plan.billingCycle] || 1)
  if (rev === 0) return '$0'
  if (rev >= 1000) return `$${(rev / 1000).toFixed(1)}k`
  return `$${rev.toFixed(0)}`
}

// ─── Speed Visual Component ──────────────────────────────────────────
function SpeedVisual({ speedDown, speedUp, label }: { speedDown: string; speedUp: string; label?: string }) {
  const downVal = speedDown ? Number(speedDown) : null
  const upVal = speedUp ? Number(speedUp) : null
  const downLabel = downVal ? formatSpeed(downVal) : 'Unlimited'
  const upLabel = upVal ? formatSpeed(upVal) : 'Unlimited'
  const maxRef = 102400

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950">
            <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                style={{ width: downVal ? `${Math.min((downVal / maxRef) * 100, 100)}%` : '100%' }}
              />
            </div>
          </div>
          <span className="text-xs font-medium w-20 text-right">{downLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-orange-100 dark:bg-orange-950">
            <ArrowUp className="h-3.5 w-3.5 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                style={{ width: upVal ? `${Math.min((upVal / maxRef) * 100, 100)}%` : '100%' }}
              />
            </div>
          </div>
          <span className="text-xs font-medium w-20 text-right">{upLabel}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Plan Preview Card ───────────────────────────────────────────────
function PlanPreviewCard({ form }: { form: ReturnType<typeof getDefaultForm> }) {
  const typeConfig = PLAN_TYPE_CONFIG[form.planType]
  const TypeIcon = typeConfig?.icon || Layers
  const dataLimitMb = form.dataLimit ? Number(form.dataLimit) * (form.dataLimitUnit === 'GB' ? 1024 : form.dataLimitUnit === 'TB' ? 1048576 : 1) : 0
  const price = Number(form.price) || 0
  const sym: Record<string, string> = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5' }[form.currency] || form.currency

  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <div className="h-[3px] rounded-t-lg bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm truncate">{form.name || 'Untitled Plan'}</h4>
          <Badge variant="outline" className="text-[10px] gap-1">
            <TypeIcon className="h-2.5 w-2.5" />
            {typeConfig?.label}
          </Badge>
        </div>
        {form.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{form.description}</p>
        )}
        <div className="text-xl font-bold">
          {price === 0 ? (
            <span className="text-emerald-600">Free</span>
          ) : (
            <span>{sym}{price.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/{form.billingCycle}</span></span>
          )}
        </div>
        <Separator />
        <div className="space-y-1.5 text-xs">
          <SpeedVisual speedDown={form.speedDown} speedUp={form.speedUp} />
          <div className="flex items-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{dataLimitMb > 0 ? formatData(dataLimitMb) : 'Unlimited'}</span>
          </div>
          {Number(form.trialDays) > 0 && (
            <div className="flex items-center gap-2 text-amber-600">
              <Zap className="h-3.5 w-3.5" />
              <span>{form.trialDays} day trial</span>
            </div>
          )}
          {Number(form.gracePeriodDays) > 0 && (
            <div className="flex items-center gap-2 text-violet-600">
              <Timer className="h-3.5 w-3.5" />
              <span>{form.gracePeriodDays} day grace period</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
          <span>{form.simultaneous} session{form.simultaneous !== '1' ? 's' : ''}</span>
          <span>{form.isActive ? 'Active' : 'Disabled'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────────
export function PlansView() {
  const queryClient = useQueryClient()

  // Filter state
  const [search, setSearch] = useState('')
  const [planTypeFilter, setPlanTypeFilter] = useState('all')
  const [cycleFilter, setCycleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [form, setForm] = useState(getDefaultForm())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null)

  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false)

  // ─── Queries ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<PlansResponse>({
    queryKey: ['plans', search, planTypeFilter, cycleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (planTypeFilter !== 'all') params.set('planType', planTypeFilter)
      if (cycleFilter !== 'all') params.set('billingCycle', cycleFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', '20')
      const res = await fetch(`/api/plans?${params}`)
      if (!res.ok) throw new Error('Failed to fetch plans')
      return res.json()
    },
  })

  const { data: policies } = useQuery<Policy[]>({
    queryKey: ['policies-list'],
    queryFn: async () => {
      const res = await fetch('/api/policies?limit=100')
      if (!res.ok) return []
      const json = await res.json()
      return json.policies || json || []
    },
  })

  // ─── Mutations ───────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create plan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan created successfully')
      closeDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update plan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan updated successfully')
      closeDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete plan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan deleted successfully')
      setDeleteDialogOpen(false)
      setDeletingPlan(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  function openCreate(template?: PlanTemplate) {
    setEditingPlan(null)
    if (template) {
      setForm({
        name: template.name,
        description: template.description,
        planType: template.planType,
        billingCycle: template.billingCycle,
        price: template.price,
        currency: template.currency,
        dataLimit: template.dataLimit,
        dataLimitUnit: 'MB',
        timeLimit: template.timeLimit,
        speedDown: template.speedDown,
        speedUp: template.speedUp,
        simultaneous: template.simultaneous,
        priority: template.priority,
        trialDays: template.trialDays,
        gracePeriodDays: template.gracePeriodDays,
        isActive: true,
        policyIds: [],
      })
    } else {
      setForm(getDefaultForm())
    }
    setDialogOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan)
    let dataLimitVal = plan.dataLimit != null ? String(plan.dataLimit) : ''
    let dataLimitUnit = 'MB'
    if (plan.dataLimit && plan.dataLimit >= 1048576) {
      dataLimitVal = String(plan.dataLimit / 1048576)
      dataLimitUnit = 'TB'
    } else if (plan.dataLimit && plan.dataLimit >= 1024) {
      dataLimitVal = String(plan.dataLimit / 1024)
      dataLimitUnit = 'GB'
    }
    setForm({
      name: plan.name,
      description: plan.description || '',
      planType: plan.planType,
      billingCycle: plan.billingCycle,
      price: String(plan.price),
      currency: plan.currency,
      dataLimit: dataLimitVal,
      dataLimitUnit,
      timeLimit: plan.timeLimit != null ? String(plan.timeLimit) : '',
      speedDown: plan.speedDown != null ? String(plan.speedDown) : '',
      speedUp: plan.speedUp != null ? String(plan.speedUp) : '',
      simultaneous: String(plan.simultaneous),
      priority: String(plan.priority),
      trialDays: String(plan.trialDays),
      gracePeriodDays: String(plan.gracePeriodDays),
      isActive: plan.isActive,
      policyIds: [],
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingPlan(null)
    setForm(getDefaultForm())
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('Plan name is required')
      return
    }

    const dataMultiplier = form.dataLimitUnit === 'GB' ? 1024 : form.dataLimitUnit === 'TB' ? 1048576 : 1
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      planType: form.planType,
      billingCycle: form.billingCycle,
      price: form.price,
      currency: form.currency,
      dataLimit: form.dataLimit === '' ? 0 : String(Number(form.dataLimit) * dataMultiplier),
      timeLimit: form.timeLimit === '' ? 0 : form.timeLimit,
      speedDown: form.speedDown === '' ? null : form.speedDown,
      speedUp: form.speedUp === '' ? null : form.speedUp,
      simultaneous: form.simultaneous,
      priority: form.priority,
      trialDays: form.trialDays,
      gracePeriodDays: form.gracePeriodDays,
      isActive: form.isActive,
      policyIds: form.policyIds,
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function toggleCompare(planId: string) {
    setSelectedForCompare((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : prev.length < 4
          ? [...prev, planId]
          : prev
    )
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Plans for comparison
  const comparisonPlans = data?.plans?.filter((p) => selectedForCompare.includes(p.id)) ?? []

  const comparisonFeatures = useMemo(() => {
    return [
      { key: 'price', label: 'Price', bestKey: 'price', render: (p: Plan) => formatPrice(p.price, p.currency, p.billingCycle) },
      { key: 'type', label: 'Type', bestKey: null, render: (p: Plan) => PLAN_TYPE_CONFIG[p.planType]?.label || p.planType },
      { key: 'cycle', label: 'Billing Cycle', bestKey: null, render: (p: Plan) => p.billingCycle.charAt(0).toUpperCase() + p.billingCycle.slice(1) },
      { key: 'download', label: 'Download Speed', bestKey: 'download', render: (p: Plan) => formatSpeed(p.speedDown) },
      { key: 'upload', label: 'Upload Speed', bestKey: 'upload', render: (p: Plan) => formatSpeed(p.speedUp) },
      { key: 'data', label: 'Data Limit', bestKey: 'data', render: (p: Plan) => formatData(p.dataLimit) },
      { key: 'time', label: 'Time Limit', bestKey: null, render: (p: Plan) => formatTime(p.timeLimit) },
      { key: 'sessions', label: 'Simultaneous', bestKey: null, render: (p: Plan) => String(p.simultaneous) },
      { key: 'trial', label: 'Trial Days', bestKey: null, render: (p: Plan) => p.trialDays > 0 ? `${p.trialDays} days` : 'None' },
      { key: 'grace', label: 'Grace Period', bestKey: null, render: (p: Plan) => p.gracePeriodDays > 0 ? `${p.gracePeriodDays} days` : 'None' },
      { key: 'subscribers', label: 'Subscribers', bestKey: null, render: (p: Plan) => String(p._count.subscriptions) },
      { key: 'revenue', label: 'Est. Monthly Revenue', bestKey: null, render: (p: Plan) => simulateRevenue(p) },
    ]
  }, [])

  // ─── Best value plan IDs for highlighting ────────────────────────
  const bestIds = useMemo(() => ({
    price: comparisonPlans.length >= 2 ? getBestPlanId(comparisonPlans, 'price') : null,
    download: comparisonPlans.length >= 2 ? getBestPlanId(comparisonPlans, 'download') : null,
    upload: comparisonPlans.length >= 2 ? getBestPlanId(comparisonPlans, 'upload') : null,
    data: comparisonPlans.length >= 2 ? getBestPlanId(comparisonPlans, 'data') : null,
  }), [comparisonPlans])

  const PLAN_TYPE_GLOW: Record<string, string> = {
    'flat-rate': 'badge-glow-success',
    'data-based': 'badge-glow-warning',
    'time-based': 'badge-glow-danger',
    hybrid: 'badge-glow-danger',
  }

  const PLAN_TYPE_GRADIENT: Record<string, string> = {
    'flat-rate': 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400',
    'data-based': 'bg-gradient-to-r from-purple-400 via-purple-500 to-fuchsia-400',
    'time-based': 'bg-gradient-to-r from-rose-400 via-red-400 to-orange-400',
    hybrid: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400',
  }

  const staggerClasses = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6']

  // ─── Computed Stats ──────────────────────────────────────────
  const plans = data?.plans
  const totalPlanCount = plans?.length || 0
  const activePlanCount = plans?.filter((p: Plan) => p.isActive).length || 0
  const mostPopularPlan = plans?.reduce((best: Plan | undefined, p: Plan) => p._count.subscriptions > (best?._count.subscriptions || 0) ? p : best, plans?.[0])
  const avgPlanPrice = totalPlanCount > 0 ? (plans?.reduce((s: number, p: Plan) => s + p.price, 0) || 0) / totalPlanCount : 0

  // ─── Quick Create Templates ──────────────────────────────────────
  const QUICK_CREATE_TEMPLATES: PlanTemplate[] = [
    {
      name: 'Basic', description: 'Entry-level plan for light browsing and email',
      planType: 'flat-rate', billingCycle: 'monthly', price: '9.99', currency: 'USD',
      speedDown: '512', speedUp: '256', dataLimit: '1024', timeLimit: '',
      simultaneous: '1', priority: '1', trialDays: '3', gracePeriodDays: '3',
    },
    {
      name: 'Standard', description: 'Good for streaming and video calls',
      planType: 'flat-rate', billingCycle: 'monthly', price: '19.99', currency: 'USD',
      speedDown: '2048', speedUp: '1024', dataLimit: '5120', timeLimit: '',
      simultaneous: '2', priority: '5', trialDays: '7', gracePeriodDays: '5',
    },
    {
      name: 'Premium', description: 'Fast plan for power users and families',
      planType: 'flat-rate', billingCycle: 'monthly', price: '39.99', currency: 'USD',
      speedDown: '10240', speedUp: '5120', dataLimit: '51200', timeLimit: '',
      simultaneous: '3', priority: '8', trialDays: '7', gracePeriodDays: '7',
    },
    {
      name: 'Enterprise', description: 'Business-grade connectivity with SLA',
      planType: 'flat-rate', billingCycle: 'monthly', price: '99.99', currency: 'USD',
      speedDown: '102400', speedUp: '51200', dataLimit: '', timeLimit: '',
      simultaneous: '10', priority: '10', trialDays: '14', gracePeriodDays: '14',
    },
    {
      name: 'Unlimited', description: 'No limits on speed or data usage',
      planType: 'flat-rate', billingCycle: 'monthly', price: '149.99', currency: 'USD',
      speedDown: '', speedUp: '', dataLimit: '', timeLimit: '',
      simultaneous: '5', priority: '10', trialDays: '7', gracePeriodDays: '7',
    },
  ]

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-transition">
      {/* Plan Statistics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Plans</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold stat-number">{totalPlanCount}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Layers className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Plans</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold stat-number text-emerald-600">{activePlanCount}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <Check className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Most Popular</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-lg font-bold truncate max-w-[120px] stat-number">{mostPopularPlan?.name || '—'}</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Price</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold stat-number">${avgPlanPrice.toFixed(2)}</p>
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
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!data?.plans?.length} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Billing Plans Export',
                  headers: ['Plan Name', 'Type', 'Billing Cycle', 'Price', 'Currency', 'Data Cap', 'Speed Up', 'Speed Down', 'Simultaneous', 'Status', 'Active Subs'],
                  filename: `billing-plans-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: (data?.plans || []).map((p) => [
                    p.name, PLAN_TYPE_CONFIG[p.planType]?.label || p.planType, p.billingCycle,
                    p.price, p.currency, formatData(p.dataLimit), formatSpeed(p.speedUp),
                    formatSpeed(p.speedDown), p.simultaneous, p.status, p._count.subscriptions,
                  ]),
                }
                exportToCSV(opts)
                toast.success(`${data?.plans.length || 0} plans exported as CSV`)
              }}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Billing Plans Export',
                  headers: ['Plan Name', 'Type', 'Billing Cycle', 'Price', 'Currency', 'Data Cap', 'Speed Up', 'Speed Down', 'Simultaneous', 'Status', 'Active Subs'],
                  filename: `billing-plans-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: (data?.plans || []).map((p) => [
                    p.name, PLAN_TYPE_CONFIG[p.planType]?.label || p.planType, p.billingCycle,
                    p.price, p.currency, formatData(p.dataLimit), formatSpeed(p.speedUp),
                    formatSpeed(p.speedDown), p.simultaneous, p.status, p._count.subscriptions,
                  ]),
                }
                exportToJSON(opts)
                toast.success(`${data?.plans.length || 0} plans exported as JSON`)
              }}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Create Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {QUICK_CREATE_TEMPLATES.map((tpl) => (
              <DropdownMenuItem key={tpl.name} onClick={() => openCreate(tpl)} className="gap-2">
                {tpl.speedDown === '' ? <Infinity className="h-3.5 w-3.5 text-emerald-500" /> : <Gauge className="h-3.5 w-3.5 text-amber-500" />}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{tpl.name}</span>
                  <span className="text-[10px] text-muted-foreground">{tpl.speedDown ? formatSpeed(Number(tpl.speedDown)) : 'Unlimited'} &middot; ${tpl.price}/mo</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Plan Templates Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Templates
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PLAN_TEMPLATES.map((tpl) => (
              <DropdownMenuItem key={tpl.name} onClick={() => openCreate(tpl)} className="gap-2">
                {tpl.speedDown === '' ? <Infinity className="h-3.5 w-3.5 text-emerald-500" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{tpl.name}</span>
                  <span className="text-[10px] text-muted-foreground">{tpl.speedDown ? formatSpeed(Number(tpl.speedDown)) : 'Unlimited'} &middot; {tpl.price === '0' ? 'Free' : `$${tpl.price}/mo`}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Compare Button */}
        <Button
          variant={comparisonMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            if (comparisonMode && selectedForCompare.length >= 2) {
              setComparisonDialogOpen(true)
            } else {
              setComparisonMode(!comparisonMode)
              setSelectedForCompare([])
            }
          }}
          disabled={comparisonMode && selectedForCompare.length < 2}
        >
          <GitCompareArrows className="mr-2 h-4 w-4" />
          {comparisonMode ? `Compare (${selectedForCompare.length})` : 'Compare'}
        </Button>

        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Plan Type Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(PLAN_TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon
          const count = data?.typeCounts?.[type] ?? 0
          return (
            <Card
              key={type}
              className="card-hover cursor-pointer"
              onClick={() => {
                setPlanTypeFilter(planTypeFilter === type ? 'all' : type)
                setPage(1)
              }}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn('flex items-center justify-center rounded-lg p-2.5', config.bg)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filter Bar */}
      <Card className="card-hover">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={planTypeFilter} onValueChange={(v) => { setPlanTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Plan Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="time-based">Time-Based</SelectItem>
                <SelectItem value="data-based">Data-Based</SelectItem>
                <SelectItem value="flat-rate">Flat-Rate</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cycleFilter} onValueChange={(v) => { setCycleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Billing Cycle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Mode Banner */}
      {comparisonMode && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <GitCompareArrows className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            Select 2-4 plans to compare. {selectedForCompare.length}/4 selected.
          </span>
          {selectedForCompare.length >= 2 && (
            <Button size="sm" variant="outline" className="ml-auto border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300" onClick={() => setComparisonDialogOpen(true)}>
              View Comparison
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-amber-600" onClick={() => { setComparisonMode(false); setSelectedForCompare([]) }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="card-hover">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-5 w-2/3 shimmer" />
                <Skeleton className="h-8 w-1/3 shimmer" />
                <Skeleton className="h-4 w-full shimmer" />
                <Skeleton className="h-4 w-3/4 shimmer" />
                <Skeleton className="h-4 w-1/2 shimmer" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plans Grid */}
      {!isLoading && data?.plans && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.plans.map((plan, planIdx) => {
              const typeConfig = PLAN_TYPE_CONFIG[plan.planType]
              const TypeIcon = typeConfig?.icon || Layers
              const isBestValue = plan.planType === 'flat-rate' && plan._count.subscriptions >= 3
              const isHighestTier = plan.priority >= 10

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'card-shine hover-lift relative overflow-hidden transition-all hover:shadow-lg animate-fade-in-up',
                    staggerClasses[planIdx % 6],
                    comparisonMode && selectedForCompare.includes(plan.id) && 'ring-2 ring-primary shadow-lg',
                    comparisonMode && !selectedForCompare.includes(plan.id) && 'opacity-60',
                    isBestValue && 'border-emerald-300 dark:border-emerald-700 gradient-border-visible',
                    isHighestTier && 'border-amber-300 dark:border-amber-700 gradient-border-visible'
                  )}
                >
                  <div className={cn('h-[3px] rounded-t-lg', PLAN_TYPE_GRADIENT[plan.planType] || PLAN_TYPE_GRADIENT['flat-rate'])} />

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {planIdx === 0 && (
                      <Badge variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] gap-1 badge-glow-success">
                        <Star className="h-3 w-3" /> Recommended
                      </Badge>
                    )}
                    {isHighestTier && (
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] gap-1">
                        <Crown className="h-3 w-3" /> Premium
                      </Badge>
                    )}
                    {isBestValue && planIdx !== 0 && (
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] gap-1">
                        <Star className="h-3 w-3" /> Popular
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Comparison Checkbox */}
                    {comparisonMode && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedForCompare.includes(plan.id)}
                          onCheckedChange={() => toggleCompare(plan.id)}
                          disabled={!selectedForCompare.includes(plan.id) && selectedForCompare.length >= 4}
                        />
                        <span className="text-xs text-muted-foreground">Select for comparison</span>
                      </div>
                    )}

                    {/* Name + Type */}
                    <div className="space-y-1.5 pr-20">
                      <h3 className="font-semibold text-lg leading-tight truncate">{plan.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('gap-1 text-xs', PLAN_TYPE_GLOW[plan.planType], typeConfig?.badgeColor)}>
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig?.label || plan.planType}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono uppercase tracking-wider text-muted-foreground border-dashed">
                          {plan.billingCycle}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[plan.status] || 'outline'} className="text-xs">
                          {plan.status}
                        </Badge>
                      </div>
                    </div>

                    {plan.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                    )}

                    {/* Price */}
                    <div className="py-2">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-bold text-emerald-600 stat-number">Free</span>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm text-muted-foreground">
                              {{ USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5' }[plan.currency] || plan.currency}
                            </span>
                            <span className="text-3xl font-bold stat-number">{plan.price.toFixed(2)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">per {plan.billingCycle}</span>
                        </>
                      )}
                    </div>

                    <Separator />

                    {/* Features List */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-sm">
                        <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <ArrowDown className="h-3 w-3 text-emerald-500" />
                            <span>{formatSpeed(plan.speedDown)}</span>
                            <span className="text-muted-foreground">/</span>
                            <ArrowUp className="h-3 w-3 text-orange-500" />
                            <span>{formatSpeed(plan.speedUp)}</span>
                          </div>
                          {(plan.speedDown || plan.speedUp) && (
                            <div className="data-bar mt-1.5">
                              <div
                                className="data-bar-fill"
                                style={{ width: `${Math.min(100, Math.max(8, ((plan.speedDown || 0) / 1048576) * 100))}%`, background: 'linear-gradient(90deg, oklch(0.65 0.2 145), oklch(0.65 0.17 162))' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{formatData(plan.dataLimit)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{formatTime(plan.timeLimit)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{plan.simultaneous} session{plan.simultaneous !== 1 ? 's' : ''}</span>
                      </div>
                      {plan.trialDays > 0 && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>{plan.trialDays} day trial</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Usage Statistics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950">
                          <Users className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{plan._count.subscriptions}</p>
                          <p className="text-muted-foreground">Active</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950">
                          <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{simulateRevenue(plan)}</p>
                          <p className="text-muted-foreground">Revenue/mo</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(plan)}>
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" title="Manage Policies">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" title="View Subscribers">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline" size="sm" className="text-xs text-destructive hover:text-destructive"
                        onClick={() => { setDeletingPlan(plan); setDeleteDialogOpen(true) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Empty state */}
          {data.plans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No plans found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || planTypeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by creating your first billing plan.'}
              </p>
              {!search && planTypeFilter === 'all' && statusFilter === 'all' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openCreate()}>
                    <Plus className="mr-2 h-4 w-4" /> Create Plan
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Sparkles className="mr-2 h-4 w-4" /> From Template
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {PLAN_TEMPLATES.map((tpl) => (
                        <DropdownMenuItem key={tpl.name} onClick={() => openCreate(tpl)}>
                          {tpl.name} — {tpl.price === '0' ? 'Free' : `$${tpl.price}/mo`}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1}&ndash;{Math.min(page * 20, data.pagination.total)} of {data.pagination.total} plans
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="text-sm font-medium px-2">Page {page} / {data.pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Plan Comparison Dialog ──────────────────────────────── */}
      <Dialog open={comparisonDialogOpen} onOpenChange={setComparisonDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5" />
              Plan Comparison
            </DialogTitle>
            <DialogDescription>Side-by-side comparison of selected plans. Best values are highlighted.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-40">Feature</th>
                    {comparisonPlans.map((plan) => (
                      <th key={plan.id} className="text-left py-3 px-4 font-semibold">
                        <div className="flex items-center gap-2">
                          {plan.name}
                          {bestIds.price === plan.id && (
                            <Badge variant="default" className="bg-emerald-500 text-white text-[10px] gap-0.5">
                              <DollarSign className="h-2.5 w-2.5" /> Best Price
                            </Badge>
                          )}
                          {bestIds.download === plan.id && (
                            <Badge variant="default" className="bg-violet-500 text-white text-[10px] gap-0.5">
                              <Gauge className="h-2.5 w-2.5" /> Fastest
                            </Badge>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, idx) => {
                    const isBestRow = feature.bestKey != null
                    return (
                      <tr key={feature.key} className={cn(idx % 2 === 0 ? 'bg-muted/30' : '')}>
                        <td className="py-2.5 pr-4 text-muted-foreground font-medium">{feature.label}</td>
                        {comparisonPlans.map((plan) => {
                          const isBest = isBestRow && bestIds[feature.bestKey as keyof typeof bestIds] === plan.id
                          return (
                            <td key={plan.id} className={cn('py-2.5 px-4', isBest && 'bg-emerald-50 dark:bg-emerald-950/30 font-semibold text-emerald-700 dark:text-emerald-400')}>
                              <div className="flex items-center gap-1.5">
                                {feature.render(plan)}
                                {isBest && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComparisonDialogOpen(false)}>Close</Button>
            <Button variant="outline" onClick={() => { setComparisonDialogOpen(false); setComparisonMode(false); setSelectedForCompare([]) }}>Exit Compare Mode</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create / Edit Dialog ────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Update the plan details, limits, and policy assignments.'
                : 'Configure a new billing plan with pricing, limits, and policies.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 mt-2 overflow-hidden">
            {/* Form side */}
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
              <Tabs defaultValue="basic" className="flex-1 overflow-hidden">
                <TabsList className="w-full">
                  <TabsTrigger value="basic" className="flex-1 text-xs">Basic</TabsTrigger>
                  <TabsTrigger value="limits" className="flex-1 text-xs">Limits</TabsTrigger>
                  <TabsTrigger value="bandwidth" className="flex-1 text-xs">Bandwidth</TabsTrigger>
                  <TabsTrigger value="advanced" className="flex-1 text-xs">Advanced</TabsTrigger>
                  <TabsTrigger value="policies" className="flex-1 text-xs">Policies</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[380px] mt-4 pr-2">
                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-4 px-1">
                    <div className="space-y-2">
                      <Label htmlFor="plan-name">Plan Name *</Label>
                      <Input id="plan-name" placeholder="e.g., Premium Business" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan-desc">Description</Label>
                      <Textarea id="plan-desc" placeholder="Describe this plan..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plan Type *</Label>
                        <Select value={form.planType} onValueChange={(v) => setForm((f) => ({ ...f, planType: v }))}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time-based">Time-Based</SelectItem>
                            <SelectItem value="data-based">Data-Based</SelectItem>
                            <SelectItem value="flat-rate">Flat-Rate</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Billing Cycle *</Label>
                        <Select value={form.billingCycle} onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plan-price">Price *</Label>
                        <Input id="plan-price" type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (\u20AC)</SelectItem>
                            <SelectItem value="GBP">GBP (\u00A3)</SelectItem>
                            <SelectItem value="JPY">JPY (\u00A5)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Limits Tab */}
                  <TabsContent value="limits" className="space-y-4 px-1">
                    <div className="space-y-2">
                      <Label>Data Cap (leave empty for unlimited)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" min="0" placeholder="Amount" value={form.dataLimit} onChange={(e) => setForm((f) => ({ ...f, dataLimit: e.target.value }))} />
                        <Select value={form.dataLimitUnit} onValueChange={(v) => setForm((f) => ({ ...f, dataLimitUnit: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MB">MB</SelectItem>
                            <SelectItem value="GB">GB</SelectItem>
                            <SelectItem value="TB">TB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Limit in minutes (leave empty for unlimited)</Label>
                      <Input type="number" min="0" placeholder="e.g., 3600 for 1 hour" value={form.timeLimit} onChange={(e) => setForm((f) => ({ ...f, timeLimit: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Simultaneous Sessions</Label>
                      <Input type="number" min="1" value={form.simultaneous} onChange={(e) => setForm((f) => ({ ...f, simultaneous: e.target.value }))} />
                    </div>
                  </TabsContent>

                  {/* Bandwidth Tab */}
                  <TabsContent value="bandwidth" className="space-y-4 px-1">
                    <p className="text-sm text-muted-foreground">Set speed limits in Kbps. Leave empty for unlimited.</p>
                    <SpeedVisual speedDown={form.speedDown} speedUp={form.speedUp} label="Bandwidth Configuration" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <ArrowDown className="h-3.5 w-3.5 text-emerald-500" /> Download Speed (Kbps)
                        </Label>
                        <Input type="number" min="0" placeholder="e.g., 10240 for 10 Mbps" value={form.speedDown} onChange={(e) => setForm((f) => ({ ...f, speedDown: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <ArrowUp className="h-3.5 w-3.5 text-orange-500" /> Upload Speed (Kbps)
                        </Label>
                        <Input type="number" min="0" placeholder="e.g., 5120 for 5 Mbps" value={form.speedUp} onChange={(e) => setForm((f) => ({ ...f, speedUp: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground w-full">Quick presets:</span>
                      {[
                        { label: '512K', d: '512', u: '256' },
                        { label: '1M', d: '1024', u: '512' },
                        { label: '2M', d: '2048', u: '1024' },
                        { label: '5M', d: '5120', u: '2560' },
                        { label: '10M', d: '10240', u: '5120' },
                        { label: '50M', d: '51200', u: '25600' },
                        { label: '100M', d: '102400', u: '51200' },
                      ].map((preset) => (
                        <Button
                          key={preset.label}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setForm((f) => ({ ...f, speedDown: preset.d, speedUp: preset.u }))}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Advanced Tab */}
                  <TabsContent value="advanced" className="space-y-4 px-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plan-priority">Priority</Label>
                        <Input id="plan-priority" type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trial-days">Trial Days</Label>
                        <Input id="trial-days" type="number" min="0" placeholder="Number of free trial days" value={form.trialDays} onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grace-days">Grace Period (Days)</Label>
                      <Input id="grace-days" type="number" min="0" placeholder="Days after billing before service suspension" value={form.gracePeriodDays} onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label htmlFor="plan-active">Active</Label>
                        <p className="text-xs text-muted-foreground">Inactive plans are hidden from subscribers</p>
                      </div>
                      <Switch id="plan-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                    </div>
                  </TabsContent>

                  {/* Policies Tab */}
                  <TabsContent value="policies" className="space-y-4 px-1">
                    <p className="text-sm text-muted-foreground">Link this plan to authorization policies.</p>
                    {policies && policies.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {policies.map((policy) => (
                          <label key={policy.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={form.policyIds.includes(policy.id)}
                              onCheckedChange={(checked) => {
                                setForm((f) => ({
                                  ...f,
                                  policyIds: checked
                                    ? [...f.policyIds, policy.id]
                                    : f.policyIds.filter((id) => id !== policy.id),
                                }))
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{policy.name}</p>
                              <p className="text-xs text-muted-foreground">{policy.type}</p>
                            </div>
                            <Badge variant={policy.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{policy.status}</Badge>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">No policies available</div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>

            {/* Preview side */}
            <div className="hidden lg:block w-[240px] shrink-0">
              <div className="sticky top-0 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
                <PlanPreviewCard form={form} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingPlan?.name}&quot;? This action cannot be undone. Subscribers on this plan will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
