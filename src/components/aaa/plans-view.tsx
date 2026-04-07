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
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Users,
  Edit,
  Trash2,
  ShieldCheck,
  Eye,
  ChevronDown,
  ChevronRight,
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
import { Slider } from '@/components/ui/slider'
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
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' }
  const sym = symbols[currency] || currency
  if (price === 0) return 'Free'
  const cycleLabels: Record<string, string> = {
    daily: 'day',
    weekly: 'wk',
    monthly: 'mo',
    yearly: 'yr',
  }
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

const PLAN_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  'time-based': { label: 'Time-Based', icon: Clock, color: 'text-teal-700', bg: 'bg-teal-100' },
  'data-based': { label: 'Data-Based', icon: Database, color: 'text-purple-700', bg: 'bg-purple-100' },
  'flat-rate': { label: 'Flat-Rate', icon: Infinity, color: 'text-emerald-700', bg: 'bg-emerald-100' },
  hybrid: { label: 'Hybrid', icon: Layers, color: 'text-amber-700', bg: 'bg-amber-100' },
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  disabled: 'destructive',
  archived: 'secondary',
}

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
  function openCreate() {
    setEditingPlan(null)
    setForm(getDefaultForm())
    setDialogOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description || '',
      planType: plan.planType,
      billingCycle: plan.billingCycle,
      price: String(plan.price),
      currency: plan.currency,
      dataLimit: plan.dataLimit != null ? String(plan.dataLimit) : '',
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

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      planType: form.planType,
      billingCycle: form.billingCycle,
      price: form.price,
      currency: form.currency,
      dataLimit: form.dataLimit === '' ? 0 : form.dataLimit,
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
      { key: 'price', label: 'Price', render: (p: Plan) => formatPrice(p.price, p.currency, p.billingCycle) },
      { key: 'type', label: 'Type', render: (p: Plan) => PLAN_TYPE_CONFIG[p.planType]?.label || p.planType },
      { key: 'cycle', label: 'Billing Cycle', render: (p: Plan) => p.billingCycle.charAt(0).toUpperCase() + p.billingCycle.slice(1) },
      { key: 'download', label: 'Download Speed', render: (p: Plan) => formatSpeed(p.speedDown) },
      { key: 'upload', label: 'Upload Speed', render: (p: Plan) => formatSpeed(p.speedUp) },
      { key: 'data', label: 'Data Limit', render: (p: Plan) => formatData(p.dataLimit) },
      { key: 'time', label: 'Time Limit', render: (p: Plan) => formatTime(p.timeLimit) },
      { key: 'sessions', label: 'Simultaneous', render: (p: Plan) => String(p.simultaneous) },
      { key: 'trial', label: 'Trial Days', render: (p: Plan) => p.trialDays > 0 ? `${p.trialDays} days` : 'None' },
      { key: 'grace', label: 'Grace Period', render: (p: Plan) => p.gracePeriodDays > 0 ? `${p.gracePeriodDays} days` : 'None' },
      { key: 'subscribers', label: 'Subscribers', render: (p: Plan) => String(p._count.subscriptions) },
    ]
  }, [])

  // Plan type badge glow classes
  const PLAN_TYPE_GLOW: Record<string, string> = {
    'flat-rate': 'badge-glow-success',
    'data-based': 'badge-glow-warning',
    'time-based': 'badge-glow-danger',
    hybrid: 'badge-glow-warning',
  }

  // Plan type gradient accent bar colors
  const PLAN_TYPE_GRADIENT: Record<string, string> = {
    'flat-rate': 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400',
    'data-based': 'bg-gradient-to-r from-purple-400 via-purple-500 to-fuchsia-400',
    'time-based': 'bg-gradient-to-r from-rose-400 via-red-400 to-orange-400',
    hybrid: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400',
  }

  const staggerClasses = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6']

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-transition">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
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
                    p.name,
                    PLAN_TYPE_CONFIG[p.planType]?.label || p.planType,
                    p.billingCycle,
                    p.price,
                    p.currency,
                    formatData(p.dataLimit),
                    formatSpeed(p.speedUp),
                    formatSpeed(p.speedDown),
                    p.simultaneous,
                    p.status,
                    p._count.subscriptions,
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
                    p.name,
                    PLAN_TYPE_CONFIG[p.planType]?.label || p.planType,
                    p.billingCycle,
                    p.price,
                    p.currency,
                    formatData(p.dataLimit),
                    formatSpeed(p.speedUp),
                    formatSpeed(p.speedDown),
                    p.simultaneous,
                    p.status,
                    p._count.subscriptions,
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
        <Button
          variant={comparisonMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setComparisonMode(!comparisonMode)
            setSelectedForCompare([])
          }}
        >
          <GitCompareArrows className="mr-2 h-4 w-4" />
          Compare
        </Button>
        <Button size="sm" onClick={openCreate}>
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
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select value={planTypeFilter} onValueChange={(v) => { setPlanTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Plan Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="time-based">Time-Based</SelectItem>
                <SelectItem value="data-based">Data-Based</SelectItem>
                <SelectItem value="flat-rate">Flat-Rate</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cycleFilter} onValueChange={(v) => { setCycleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Billing Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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
            Select up to 4 plans to compare. {selectedForCompare.length}/4 selected.
          </span>
          {selectedForCompare.length >= 2 && (
            <Button size="sm" variant="outline" className="ml-auto border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300" onClick={() => setComparisonMode(false)}>
              View Comparison
            </Button>
          )}
        </div>
      )}

      {/* Plan Comparison Table */}
      {comparisonMode && selectedForCompare.length >= 2 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5" />
              Plan Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-40">Feature</th>
                      {comparisonPlans.map((plan) => (
                        <th key={plan.id} className="text-left py-3 px-4 font-semibold">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, idx) => (
                      <tr key={feature.key} className={cn(idx % 2 === 0 ? 'bg-muted/30' : '')}>
                        <td className="py-2.5 pr-4 text-muted-foreground font-medium">{feature.label}</td>
                        {comparisonPlans.map((plan) => (
                          <td key={plan.id} className="py-2.5 px-4">
                            {feature.render(plan)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
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
                    'card-hover relative overflow-hidden transition-all hover:shadow-lg animate-fade-in-up',
                    staggerClasses[planIdx % 6],
                    comparisonMode && selectedForCompare.includes(plan.id) && 'ring-2 ring-primary shadow-lg',
                    isBestValue && 'border-emerald-300 dark:border-emerald-700',
                    isHighestTier && 'border-amber-300 dark:border-amber-700'
                  )}
                >
                  {/* Decorative top accent gradient bar */}
                  <div className={cn('h-[3px] rounded-t-lg', PLAN_TYPE_GRADIENT[plan.planType] || PLAN_TYPE_GRADIENT['flat-rate'])} />

                  {/* Badges on card top-right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {planIdx === 0 && (
                      <Badge variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] gap-1 badge-glow-success">
                        <Star className="h-3 w-3" />
                        Recommended
                      </Badge>
                    )}
                    {isHighestTier && (
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] gap-1">
                        <Crown className="h-3 w-3" />
                        Premium
                      </Badge>
                    )}
                    {isBestValue && planIdx !== 0 && (
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] gap-1">
                        <Star className="h-3 w-3" />
                        Popular
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('gap-1 text-xs', PLAN_TYPE_GLOW[plan.planType])}>
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig?.label || plan.planType}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[plan.status] || 'outline'} className="text-xs">
                          {plan.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                    )}

                    {/* Price */}
                    <div className="py-2">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-bold text-emerald-600">Free</span>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm text-muted-foreground">
                              {{ USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5' }[plan.currency] || plan.currency}
                            </span>
                            <span className="text-3xl font-bold">{plan.price.toFixed(2)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            per {plan.billingCycle}
                          </span>
                        </>
                      )}
                    </div>

                    <Separator />

                    {/* Features List */}
                    <div className="space-y-2.5">
                      {/* Speed */}
                      <div className="flex items-center gap-2.5 text-sm">
                        <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-1.5">
                          <ArrowDown className="h-3 w-3 text-emerald-500" />
                          <span>{formatSpeed(plan.speedDown)}</span>
                          <span className="text-muted-foreground">/</span>
                          <ArrowUp className="h-3 w-3 text-orange-500" />
                          <span>{formatSpeed(plan.speedUp)}</span>
                        </div>
                      </div>

                      {/* Data Limit */}
                      <div className="flex items-center gap-2.5 text-sm">
                        <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{formatData(plan.dataLimit)}</span>
                      </div>

                      {/* Time Limit */}
                      <div className="flex items-center gap-2.5 text-sm">
                        <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{formatTime(plan.timeLimit)}</span>
                      </div>

                      {/* Simultaneous Sessions */}
                      <div className="flex items-center gap-2.5 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{plan.simultaneous} session{plan.simultaneous !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Trial Days */}
                      {plan.trialDays > 0 && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>{plan.trialDays} day trial</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Subscribers Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {plan._count.subscriptions} subscriber{plan._count.subscriptions !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Priority: {plan.priority}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(plan)}>
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" title="Manage Policies">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" title="View Subscribers">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingPlan(plan)
                          setDeleteDialogOpen(true)
                        }}
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
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Plan
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1}&ndash;{Math.min(page * 20, data.pagination.total)} of{' '}
                {data.pagination.total} plans
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium px-2">
                  Page {page} / {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Create / Edit Dialog ────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Update the plan details, limits, and policy assignments.'
                : 'Configure a new billing plan with pricing, limits, and policies.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
              <TabsTrigger value="limits" className="flex-1">Limits</TabsTrigger>
              <TabsTrigger value="bandwidth" className="flex-1">Bandwidth</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
              <TabsTrigger value="policies" className="flex-1">Policies</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[420px] mt-4 pr-2">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Plan Name *</Label>
                  <Input
                    id="plan-name"
                    placeholder="e.g., Premium Business"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-desc">Description</Label>
                  <Textarea
                    id="plan-desc"
                    placeholder="Describe this plan..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan Type *</Label>
                    <Select
                      value={form.planType}
                      onValueChange={(v) => setForm((f) => ({ ...f, planType: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Select
                      value={form.billingCycle}
                      onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Input
                      id="plan-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
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
              <TabsContent value="limits" className="space-y-6 px-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Data Limit (MB)</Label>
                    <span className="text-sm font-medium text-muted-foreground">
                      {form.dataLimit === '' ? 'Unlimited' : formatData(parseInt(form.dataLimit) || 0)}
                    </span>
                  </div>
                  <Slider
                    value={[form.dataLimit === '' ? 0 : parseInt(form.dataLimit) || 0]}
                    max={102400}
                    step={1024}
                    onValueChange={([val]) =>
                      setForm((f) => ({ ...f, dataLimit: val === 0 ? '' : String(val) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">0 MB = Unlimited. Slide to set data cap.</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Time Limit (minutes)</Label>
                    <span className="text-sm font-medium text-muted-foreground">
                      {form.timeLimit === '' ? 'Unlimited' : formatTime(parseInt(form.timeLimit) || 0)}
                    </span>
                  </div>
                  <Slider
                    value={[form.timeLimit === '' ? 0 : parseInt(form.timeLimit) || 0]}
                    max={43200}
                    step={60}
                    onValueChange={([val]) =>
                      setForm((f) => ({ ...f, timeLimit: val === 0 ? '' : String(val) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">0 min = Unlimited. Slide to set time cap.</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="plan-simultaneous">Simultaneous Sessions</Label>
                  <Input
                    id="plan-simultaneous"
                    type="number"
                    min="1"
                    max="100"
                    value={form.simultaneous}
                    onChange={(e) => setForm((f) => ({ ...f, simultaneous: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of concurrent connections per user.
                  </p>
                </div>
              </TabsContent>

              {/* Bandwidth Tab */}
              <TabsContent value="bandwidth" className="space-y-6 px-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Download Speed (Kbps)</Label>
                      <ArrowDown className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {form.speedDown === '' ? 'Unlimited' : formatSpeed(parseInt(form.speedDown) || 0)}
                    </span>
                  </div>
                  <Slider
                    value={[form.speedDown === '' ? 0 : parseInt(form.speedDown) || 0]}
                    max={1000000}
                    step={1024}
                    onValueChange={([val]) =>
                      setForm((f) => ({ ...f, speedDown: val === 0 ? '' : String(val) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Leave at 0 for unlimited download speed.</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Upload Speed (Kbps)</Label>
                      <ArrowUp className="h-4 w-4 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {form.speedUp === '' ? 'Unlimited' : formatSpeed(parseInt(form.speedUp) || 0)}
                    </span>
                  </div>
                  <Slider
                    value={[form.speedUp === '' ? 0 : parseInt(form.speedUp) || 0]}
                    max={1000000}
                    step={1024}
                    onValueChange={([val]) =>
                      setForm((f) => ({ ...f, speedUp: val === 0 ? '' : String(val) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Leave at 0 for unlimited upload speed.</p>
                </div>

                {/* Quick Preset Buttons */}
                <Separator />
                <div>
                  <Label className="mb-2 block">Speed Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '10 Mbps', down: 10240, up: 5120 },
                      { label: '25 Mbps', down: 25600, up: 12800 },
                      { label: '50 Mbps', down: 51200, up: 25600 },
                      { label: '100 Mbps', down: 102400, up: 51200 },
                      { label: '500 Mbps', down: 512000, up: 512000 },
                      { label: '1 Gbps', down: 1000000, up: 1000000 },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            speedDown: String(preset.down),
                            speedUp: String(preset.up),
                          }))
                        }
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4 px-1">
                <div className="space-y-2">
                  <Label htmlFor="plan-priority">Priority</Label>
                  <Input
                    id="plan-priority"
                    type="number"
                    min="0"
                    max="100"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher priority plans are shown first and may get preferential treatment.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan-trial">Trial Days</Label>
                    <Input
                      id="plan-trial"
                      type="number"
                      min="0"
                      value={form.trialDays}
                      onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Free trial period for new subscribers.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-grace">Grace Period (days)</Label>
                    <Input
                      id="plan-grace"
                      type="number"
                      min="0"
                      value={form.gracePeriodDays}
                      onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Days after expiry before suspension.</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active Status</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this plan for new subscriptions.
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                  />
                </div>
              </TabsContent>

              {/* Policies Tab */}
              <TabsContent value="policies" className="space-y-4 px-1">
                <div>
                  <Label className="mb-2 block">Assigned Policies</Label>
                  {policies && policies.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto rounded-lg border p-3">
                      {policies.map((policy) => {
                        const isChecked = form.policyIds.includes(policy.id)
                        return (
                          <label
                            key={policy.id}
                            className={cn(
                              'flex items-center gap-3 rounded-md p-2.5 cursor-pointer transition-colors',
                              isChecked ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setForm((f) => ({
                                  ...f,
                                  policyIds: checked
                                    ? [...f.policyIds, policy.id]
                                    : f.policyIds.filter((pid) => pid !== policy.id),
                                }))
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{policy.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {policy.type} &middot; {policy.status}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No policies available.</p>
                      <p className="text-xs text-muted-foreground">Create policies first, then assign them to plans.</p>
                    </div>
                  )}
                </div>

                {form.policyIds.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {form.policyIds.length} polic{form.policyIds.length === 1 ? 'y' : 'ies'} selected
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingPlan?.name}&quot;? This action cannot be undone.
              {deletingPlan && deletingPlan._count.subscriptions > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  Warning: This plan has {deletingPlan._count.subscriptions} active subscriber(s). You cannot
                  delete it unless all subscriptions are removed first. Consider archiving instead.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending || Boolean(deletingPlan && deletingPlan._count.subscriptions > 0)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
