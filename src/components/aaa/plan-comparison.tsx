'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  GitCompareArrows,
  Check,
  X,
  ArrowDown,
  ArrowUp,
  HardDrive,
  Clock,
  Users,
  Crown,
  Zap,
  Timer,
  Shield,
  Star,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

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

// ─── Configs ─────────────────────────────────────────────────────────
const PLAN_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; badgeColor: string }> = {
  'time-based': { label: 'Time-Based', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950', badgeColor: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25' },
  'data-based': { label: 'Data-Based', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950', badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' },
  'flat-rate': { label: 'Flat-Rate', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950', badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' },
  hybrid: { label: 'Hybrid', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950', badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25' },
}

const PLAN_TYPE_GRADIENT: Record<string, string> = {
  'flat-rate': 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400',
  'data-based': 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400',
  'time-based': 'bg-gradient-to-r from-violet-400 via-violet-500 to-fuchsia-400',
  hybrid: 'bg-gradient-to-r from-rose-400 via-rose-500 to-pink-400',
}

// ─── Helpers ─────────────────────────────────────────────────────────
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
  if (feature === 'sessions') {
    return plans.reduce((best, p) => p.simultaneous > best.simultaneous ? p : best).id
  }
  if (feature === 'trial') {
    const withTrial = plans.filter(p => p.trialDays > 0)
    if (withTrial.length < 2) return null
    return withTrial.reduce((best, p) => p.trialDays > best.trialDays ? p : best).id
  }
  return null
}

function getBestValuePlanId(plans: Plan[]): string | null {
  if (plans.length < 2) return null
  const nonFree = plans.filter(p => p.price > 0)
  if (nonFree.length < 2) return null
  // Calculate value score: (download + upload in Mbps) / price
  const scored = nonFree.map(p => ({
    id: p.id,
    score: ((p.speedDown ?? 0) + (p.speedUp ?? 0)) / 1000 / p.price,
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.id ?? null
}

function getPlanFeatures(plan: Plan): { label: string; has: boolean }[] {
  return [
    { label: 'Unlimited Data', has: !plan.dataLimit },
    { label: 'Unlimited Speed', has: !plan.speedDown && !plan.speedUp },
    { label: 'Unlimited Time', has: !plan.timeLimit },
    { label: 'Free Trial', has: plan.trialDays > 0 },
    { label: 'Grace Period', has: plan.gracePeriodDays > 0 },
    { label: 'Multi-Session', has: plan.simultaneous > 1 },
    { label: 'Active Status', has: plan.isActive },
    { label: 'Priority Support', has: plan.priority >= 8 },
  ]
}

// ─── Speed Bar Component ─────────────────────────────────────────────
function SpeedBar({ speed, maxRef, gradient }: { speed: number | null; maxRef: number; gradient: string }) {
  const pct = speed ? Math.min((speed / maxRef) * 100, 100) : 100
  return (
    <div className="data-bar w-full">
      <div
        className="data-bar-fill"
        style={{
          width: `${pct}%`,
          background: speed ? gradient : 'linear-gradient(90deg, oklch(0.65 0.2 145), oklch(0.65 0.17 162))',
        }}
      />
    </div>
  )
}

// ─── Feature Checkmark Component ─────────────────────────────────────
function FeatureCheck({ has, label }: { has: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {has ? (
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 shrink-0">
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : (
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted shrink-0">
          <X className="h-3 w-3 text-muted-foreground/50" />
        </div>
      )}
      <span className={cn('text-xs', has ? 'text-foreground' : 'text-muted-foreground/60')}>
        {label}
      </span>
    </div>
  )
}

// ─── Plan Column Header Card ─────────────────────────────────────────
function PlanColumnCard({
  plan,
  isBestValue,
  onRemove,
  onSelect,
}: {
  plan: Plan
  isBestValue: boolean
  onRemove: () => void
  onSelect: () => void
}) {
  const typeConfig = PLAN_TYPE_CONFIG[plan.planType]
  const gradient = PLAN_TYPE_GRADIENT[plan.planType] || PLAN_TYPE_GRADIENT['flat-rate']
  const cycleLabel = plan.billingCycle.charAt(0).toUpperCase() + plan.billingCycle.slice(1)

  return (
    <Card
      className={cn(
        'relative overflow-hidden card-shine hover-lift transition-all duration-200',
        isBestValue && 'ring-2 ring-emerald-400/60 dark:ring-emerald-500/40'
      )}
    >
      {isBestValue && (
        <div className={cn('h-1 w-full', gradient)} />
      )}

      <CardContent className="p-4 space-y-3">
        {/* Best Value Badge */}
        {isBestValue && (
          <div className="flex items-center justify-center">
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 gap-1 text-[10px] font-semibold px-2">
              <Crown className="h-3 w-3" />
              Best Value
            </Badge>
          </div>
        )}

        {/* Plan Name & Type */}
        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-sm leading-tight">{plan.name}</h3>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {typeConfig && (
              <Badge variant="outline" className={cn('text-[10px] gap-1 border', typeConfig.badgeColor)}>
                {typeConfig.label}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] border-dashed font-mono">
              {cycleLabel}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Price */}
        <div className="text-center">
          {plan.price === 0 ? (
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 stat-number">Free</span>
          ) : (
            <div>
              <span className="text-2xl font-bold stat-number">
                {plan.currency === 'USD' ? '$' : plan.currency}
                {plan.price.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground ml-0.5">/{plan.billingCycle === 'monthly' ? 'mo' : plan.billingCycle === 'daily' ? 'day' : plan.billingCycle === 'weekly' ? 'wk' : 'yr'}</span>
            </div>
          )}
        </div>

        {/* Active Subscribers */}
        {plan._count?.subscriptions > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">
            <Users className="h-3 w-3 inline mr-1" />
            {plan._count.subscriptions} active subscriber{plan._count.subscriptions !== 1 ? 's' : ''}
          </p>
        )}

        {/* CTA Button */}
        <Button
          className={cn(
            'w-full btn-glow text-xs',
            isBestValue
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
              : ''
          )}
          onClick={onSelect}
          size="sm"
        >
          <Star className="h-3.5 w-3.5 mr-1.5" />
          Select Plan
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export function PlanComparison() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)

  // Fetch all active plans
  const { data, isLoading, error } = useQuery<PlansResponse>({
    queryKey: ['plans-comparison-all'],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('status', 'active')
      params.set('limit', '50')
      const res = await fetch(`/api/plans?${params}`)
      if (!res.ok) throw new Error('Failed to fetch plans')
      return res.json()
    },
    staleTime: 60000,
  })

  const allPlans = data?.plans ?? []

  // Selected plans
  const selectedPlans = useMemo(
    () => allPlans.filter(p => selectedIds.includes(p.id)),
    [allPlans, selectedIds]
  )

  // Best value and per-feature bests
  const bestValueId = useMemo(() => getBestValuePlanId(selectedPlans), [selectedPlans])
  const bestIds = useMemo(
    () => ({
      price: getBestPlanId(selectedPlans, 'price'),
      download: getBestPlanId(selectedPlans, 'download'),
      upload: getBestPlanId(selectedPlans, 'upload'),
      data: getBestPlanId(selectedPlans, 'data'),
      sessions: getBestPlanId(selectedPlans, 'sessions'),
      trial: getBestPlanId(selectedPlans, 'trial'),
    }),
    [selectedPlans]
  )

  // Max speeds for bar scaling
  const maxDown = useMemo(() => Math.max(...selectedPlans.map(p => p.speedDown ?? 0), 1), [selectedPlans])
  const maxUp = useMemo(() => Math.max(...selectedPlans.map(p => p.speedUp ?? 0), 1), [selectedPlans])

  const togglePlan = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev
    )
  }, [])

  const clearAll = useCallback(() => {
    setSelectedIds([])
    setShowComparison(false)
  }, [])

  const handleSelectPlan = useCallback((plan: Plan) => {
    toast.success(`Selected "${plan.name}" plan`, {
      description: `${formatPrice(plan.price, plan.currency, plan.billingCycle)}`,
    })
  }, [])

  // Comparison rows definition
  const comparisonRows = useMemo(() => [
    {
      section: 'Pricing & Type',
      rows: [
        { key: 'price', label: 'Price', icon: <Zap className="h-3.5 w-3.5 text-amber-500" />, bestKey: 'price' as const },
        { key: 'type', label: 'Type', icon: <Shield className="h-3.5 w-3.5 text-violet-500" /> },
        { key: 'cycle', label: 'Billing Cycle', icon: <Clock className="h-3.5 w-3.5 text-teal-500" /> },
      ],
    },
    {
      section: 'Speed & Data',
      rows: [
        { key: 'download', label: 'Download', icon: <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />, bestKey: 'download' as const, hasBar: true },
        { key: 'upload', label: 'Upload', icon: <ArrowUp className="h-3.5 w-3.5 text-orange-500" />, bestKey: 'upload' as const, hasBar: true },
        { key: 'data', label: 'Data Cap', icon: <HardDrive className="h-3.5 w-3.5 text-rose-500" />, bestKey: 'data' as const },
      ],
    },
    {
      section: 'Usage Limits',
      rows: [
        { key: 'time', label: 'Time Limit', icon: <Timer className="h-3.5 w-3.5 text-violet-500" /> },
        { key: 'sessions', label: 'Sessions', icon: <Users className="h-3.5 w-3.5 text-teal-500" />, bestKey: 'sessions' as const },
      ],
    },
    {
      section: 'Extras',
      rows: [
        { key: 'trial', label: 'Free Trial', icon: <Star className="h-3.5 w-3.5 text-amber-500" />, bestKey: 'trial' as const },
        { key: 'grace', label: 'Grace Period', icon: <Timer className="h-3.5 w-3.5 text-violet-500" /> },
        { key: 'subscribers', label: 'Subscribers', icon: <Users className="h-3.5 w-3.5 text-slate-500" /> },
      ],
    },
  ], [])

  function renderCellValue(plan: Plan, key: string) {
    switch (key) {
      case 'price': return formatPrice(plan.price, plan.currency, plan.billingCycle)
      case 'type': {
        const cfg = PLAN_TYPE_CONFIG[plan.planType]
        return cfg ? (
          <Badge variant="outline" className={cn('text-[10px] gap-1 border', cfg.badgeColor)}>
            {cfg.label}
          </Badge>
        ) : plan.planType
      }
      case 'cycle': return plan.billingCycle.charAt(0).toUpperCase() + plan.billingCycle.slice(1)
      case 'download': return formatSpeed(plan.speedDown)
      case 'upload': return formatSpeed(plan.speedUp)
      case 'data': return formatData(plan.dataLimit)
      case 'time': return formatTime(plan.timeLimit)
      case 'sessions': return String(plan.simultaneous)
      case 'trial': return plan.trialDays > 0 ? `${plan.trialDays} days` : 'None'
      case 'grace': return plan.gracePeriodDays > 0 ? `${plan.gracePeriodDays} days` : 'None'
      case 'subscribers': return String(plan._count?.subscriptions ?? 0)
      default: return '—'
    }
  }

  // ─── Loading State ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <GitCompareArrows className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Plan Comparison Tool</h2>
            <p className="text-xs text-muted-foreground">Loading available plans...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ─── Error State ───────────────────────────────────────────────────
  if (error || allPlans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
        <div className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="text-lg font-bold mb-1">No Plans Available</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {error ? 'Failed to load plans. Please try again later.' : 'Create some billing plans first to compare them.'}
        </p>
      </div>
    )
  }

  // ─── Selection Phase ───────────────────────────────────────────────
  if (!showComparison || selectedIds.length < 2) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <GitCompareArrows className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Plan Comparison Tool</h2>
              <p className="text-xs text-muted-foreground">
                Select 2-4 plans to compare side-by-side
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-mono tabular-nums px-2.5',
                selectedIds.length >= 2
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                  : 'border-muted'
              )}
            >
              {selectedIds.length}/4 selected
            </Badge>
            {selectedIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs gap-1.5">
                <RotateCcw className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Plan Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allPlans.map((plan, i) => {
            const isSelected = selectedIds.includes(plan.id)
            const isFull = selectedIds.length >= 4 && !isSelected
            const typeConfig = PLAN_TYPE_CONFIG[plan.planType]
            const staggerClass = `stagger-${(i % 6) + 1}`

            return (
              <Card
                key={plan.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 animate-fade-in-up',
                  staggerClass,
                  isSelected && 'ring-2 ring-emerald-400/60 dark:ring-emerald-500/40 card-shine',
                  isFull && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !isFull && togglePlan(plan.id)}
              >
                <CardContent className="p-4 space-y-2.5">
                  {/* Checkbox + Type */}
                  <div className="flex items-start justify-between gap-2">
                    <Checkbox
                      checked={isSelected}
                      disabled={isFull}
                      onCheckedChange={() => togglePlan(plan.id)}
                      className="mt-0.5"
                    />
                    {typeConfig && (
                      <Badge variant="outline" className={cn('text-[9px] gap-0.5 border shrink-0', typeConfig.badgeColor)}>
                        {typeConfig.label}
                      </Badge>
                    )}
                  </div>

                  {/* Name & Description */}
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="stat-number">
                    {plan.price === 0 ? (
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                    ) : (
                      <div className="text-lg font-bold">
                        {plan.currency === 'USD' ? '$' : plan.currency}
                        {plan.price.toFixed(2)}
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                          /{plan.billingCycle === 'monthly' ? 'mo' : plan.billingCycle.slice(0, -2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Quick Stats */}
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-3 w-3 text-emerald-500" />
                      <span>{formatSpeed(plan.speedDown)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-3 w-3 text-orange-500" />
                      <span>{formatSpeed(plan.speedUp)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatData(plan.dataLimit)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Compare Button */}
        {selectedIds.length >= 2 && (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="btn-glow gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8"
              onClick={() => setShowComparison(true)}
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare {selectedIds.length} Plans
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ─── Comparison View ───────────────────────────────────────────────
  const colGrid = selectedPlans.length === 2
    ? 'grid-cols-2'
    : selectedPlans.length === 3
      ? 'grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-2 lg:grid-cols-4'

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <GitCompareArrows className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Plan Comparison</h2>
            <p className="text-xs text-muted-foreground">
              Comparing {selectedPlans.length} plans side-by-side
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowComparison(false)} className="gap-1.5 text-xs">
            <ChevronUp className="h-3 w-3" />
            Back to Selection
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-xs">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Plan Column Headers */}
      <div className={cn('grid gap-4', colGrid)}>
        {selectedPlans.map(plan => (
          <PlanColumnCard
            key={plan.id}
            plan={plan}
            isBestValue={plan.id === bestValueId}
            onRemove={() => togglePlan(plan.id)}
            onSelect={() => handleSelectPlan(plan)}
          />
        ))}
      </div>

      {/* Comparison Matrix */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px] scrollbar-thin">
            <div>
              {comparisonRows.map(section => (
                <div key={section.section}>
                  {/* Section Header */}
                  <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-y px-4 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.section}
                    </span>
                  </div>

                  {/* Rows */}
                  {section.rows.map(row => (
                    <div
                      key={row.key}
                      className={cn(
                        'table-row-hover grid items-center',
                        colGrid,
                        row.hasBar ? '' : 'divide-x divide-border/50'
                      )}
                    >
                      {selectedPlans.map(plan => {
                        const isBest = row.bestKey ? bestIds[row.bestKey] === plan.id : false
                        return (
                          <div
                            key={plan.id}
                            className={cn(
                              'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3',
                              isBest && 'bg-emerald-50/60 dark:bg-emerald-950/30'
                            )}
                          >
                            {/* Label Column (mobile) / Value */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="shrink-0">{row.icon}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider sm:hidden">
                                  {row.label}
                                </span>
                                <span className={cn(
                                  'text-sm font-medium truncate',
                                  isBest && 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                )}>
                                  {renderCellValue(plan, row.key)}
                                </span>
                                {isBest && (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-[9px] px-1.5 py-0 shrink-0">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                    Best
                                  </Badge>
                                )}
                              </div>
                              {/* Speed Bar */}
                              {row.hasBar && (
                                <div className="mt-1.5 ml-5">
                                  {row.key === 'download' && (
                                    <SpeedBar
                                      speed={plan.speedDown}
                                      maxRef={maxDown}
                                      gradient="linear-gradient(90deg, oklch(0.65 0.2 145), oklch(0.65 0.17 162))"
                                    />
                                  )}
                                  {row.key === 'upload' && (
                                    <SpeedBar
                                      speed={plan.speedUp}
                                      maxRef={maxUp}
                                      gradient="linear-gradient(90deg, oklch(0.75 0.18 70), oklch(0.8 0.16 50))"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ))}

              {/* Features Section */}
              <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-y px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Features
                </span>
              </div>
              <div className={cn('grid', colGrid, 'divide-x divide-border/50')}>
                {selectedPlans.map(plan => (
                  <div key={plan.id} className="px-4 py-3 space-y-0.5">
                    {getPlanFeatures(plan).map(feat => (
                      <FeatureCheck key={feat.label} has={feat.has} label={feat.label} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {selectedPlans.map(plan => (
          <Button
            key={plan.id}
            variant={plan.id === bestValueId ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'gap-2',
              plan.id === bestValueId && 'btn-glow bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
            )}
            onClick={() => handleSelectPlan(plan)}
          >
            <Star className="h-3.5 w-3.5" />
            Select {plan.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
