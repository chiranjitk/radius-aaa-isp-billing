'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Percent,
  Globe,
  Layers,
  TrendingUp,
  Edit,
  Trash2,
  MapPin,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Copy,
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
import { Skeleton } from '@/components/ui/skeleton'
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
interface TaxRate {
  id: string
  name: string
  rate: number
  type: string
  status: string
  isCompound: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

interface TaxZone {
  id: string
  name: string
  country: string | null
  state: string | null
  city: string | null
  taxRateIds: string
  isDefault: boolean
  status: string
  createdAt: string
  updatedAt: string
}

interface TaxResponse {
  taxRates: TaxRate[]
  zones: TaxZone[]
  stats: {
    totalRates: number
    activeRates: number
    totalZones: number
    activeZones: number
    taxCollectedMonth: number
  }
}

// ─── Status config ──────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Active' },
  disabled: { variant: 'destructive', label: 'Disabled' },
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  return `$${amount.toFixed(2)}`
}

// ─── Component ───────────────────────────────────────────────────────
export function TaxView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('rates')

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Dialogs
  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'rate' | 'zone'; id: string; name: string } | null>(null)

  // Form state
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)
  const [editingZone, setEditingZone] = useState<TaxZone | null>(null)
  const [rateForm, setRateForm] = useState({ name: '', rate: '', type: 'percentage', isCompound: false, priority: '0' })
  const [zoneForm, setZoneForm] = useState({ name: '', country: '', state: '', city: '', taxRateIds: [] as string[], isDefault: false })

  // ─── Queries ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<TaxResponse>({
    queryKey: ['tax'],
    queryFn: async () => {
      const res = await fetch('/api/tax')
      if (!res.ok) throw new Error('Failed to fetch tax data')
      return res.json()
    },
  })

  const { data: zoneData } = useQuery({
    queryKey: ['tax-zones'],
    queryFn: async () => {
      const res = await fetch('/api/tax-zones')
      if (!res.ok) throw new Error('Failed to fetch zones')
      return res.json()
    },
  })

  // ─── Rate Mutations ─────────────────────────────────────────────
  const createRateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] })
      toast.success('Tax rate created')
      closeRateDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/tax/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] })
      toast.success('Tax rate updated')
      closeRateDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteRateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tax/${id}`, { method: 'DELETE' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to delete') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] })
      toast.success('Tax rate deleted')
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Zone Mutations ─────────────────────────────────────────────
  const createZoneMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/tax-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] })
      queryClient.invalidateQueries({ queryKey: ['tax-zones'] })
      toast.success('Tax zone created')
      closeZoneDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/tax-zones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] })
      queryClient.invalidateQueries({ queryKey: ['tax-zones'] })
      toast.success('Tax zone updated')
      closeZoneDialog()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tax-zones/${id}`, { method: 'DELETE' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to delete') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] })
      queryClient.invalidateQueries({ queryKey: ['tax-zones'] })
      toast.success('Tax zone deleted')
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Toggle rate status
  const toggleRateStatus = useMutation({
    mutationFn: async (rate: TaxRate) => {
      const res = await fetch(`/api/tax/${rate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: rate.status === 'active' ? 'disabled' : 'active' }),
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] })
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  function openCreateRate() {
    setEditingRate(null)
    setRateForm({ name: '', rate: '', type: 'percentage', isCompound: false, priority: '0' })
    setRateDialogOpen(true)
  }

  function openEditRate(rate: TaxRate) {
    setEditingRate(rate)
    setRateForm({
      name: rate.name,
      rate: String(rate.rate),
      type: rate.type,
      isCompound: rate.isCompound,
      priority: String(rate.priority),
    })
    setRateDialogOpen(true)
  }

  function closeRateDialog() {
    setRateDialogOpen(false)
    setEditingRate(null)
  }

  function submitRate() {
    if (!rateForm.name.trim()) { toast.error('Name is required'); return }
    if (!rateForm.rate || parseFloat(rateForm.rate) < 0) { toast.error('Valid rate is required'); return }
    const payload = {
      name: rateForm.name.trim(),
      rate: rateForm.rate,
      type: rateForm.type,
      isCompound: rateForm.isCompound,
      priority: rateForm.priority,
    }
    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data: payload })
    } else {
      createRateMutation.mutate(payload)
    }
  }

  function openCreateZone() {
    setEditingZone(null)
    setZoneForm({ name: '', country: '', state: '', city: '', taxRateIds: [], isDefault: false })
    setZoneDialogOpen(true)
  }

  function openEditZone(zone: TaxZone) {
    setEditingZone(zone)
    let parsedIds: string[] = []
    try { parsedIds = JSON.parse(zone.taxRateIds) } catch { /* empty */ }
    setZoneForm({
      name: zone.name,
      country: zone.country || '',
      state: zone.state || '',
      city: zone.city || '',
      taxRateIds: parsedIds,
      isDefault: zone.isDefault,
    })
    setZoneDialogOpen(true)
  }

  function closeZoneDialog() {
    setZoneDialogOpen(false)
    setEditingZone(null)
  }

  function submitZone() {
    if (!zoneForm.name.trim()) { toast.error('Zone name is required'); return }
    const payload = {
      name: zoneForm.name.trim(),
      country: zoneForm.country || null,
      state: zoneForm.state || null,
      city: zoneForm.city || null,
      taxRateIds: zoneForm.taxRateIds,
      isDefault: zoneForm.isDefault,
    }
    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data: payload })
    } else {
      createZoneMutation.mutate(payload)
    }
  }

  function toggleZoneRateId(rateId: string) {
    setZoneForm((prev) => ({
      ...prev,
      taxRateIds: prev.taxRateIds.includes(rateId)
        ? prev.taxRateIds.filter((id) => id !== rateId)
        : [...prev.taxRateIds, rateId],
    }))
  }

  function confirmDelete(type: 'rate' | 'zone', id: string, name: string) {
    setDeleteTarget({ type, id, name })
    setDeleteDialogOpen(true)
  }

  // ─── Filtered data ───────────────────────────────────────────────
  const filteredRates = (data?.taxRates || []).filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    return true
  })

  const allRates = data?.taxRates || []
  const allZones = data?.zones || []
  const stats = data?.stats

  const isSubmittingRate = createRateMutation.isPending || updateRateMutation.isPending
  const isSubmittingZone = createZoneMutation.isPending || updateZoneMutation.isPending

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-transition">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Tax Rates</p>
                {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold stat-number">{stats?.totalRates ?? 0}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Percent className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Rates</p>
                {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold stat-number text-emerald-600">{stats?.activeRates ?? 0}</p>}
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Zones</p>
                {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold stat-number">{stats?.activeZones ?? 0}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Globe className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax This Month</p>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold stat-number">{formatCurrency(stats?.taxCollectedMonth ?? 0)}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="rates" className="gap-2">
              <Percent className="h-3.5 w-3.5" />
              Tax Rates
            </TabsTrigger>
            <TabsTrigger value="zones" className="gap-2">
              <Globe className="h-3.5 w-3.5" />
              Tax Zones
            </TabsTrigger>
          </TabsList>

          {activeTab === 'rates' && (
            <Button size="sm" onClick={openCreateRate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tax Rate
            </Button>
          )}
          {activeTab === 'zones' && (
            <Button size="sm" onClick={openCreateZone}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tax Zone
            </Button>
          )}
        </div>

        {/* ─── Tax Rates Tab ──────────────────────────────────────── */}
        <TabsContent value="rates" className="space-y-4">
          {/* Filter Bar */}
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tax rates..."
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
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tax Rates Table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Compound</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Percent className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>No tax rates found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRates.map((rate) => (
                        <TableRow key={rate.id} className="group">
                          <TableCell className="font-medium">{rate.name}</TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {rate.type === 'percentage' ? `${rate.rate}%` : `$${rate.rate.toFixed(2)}`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {rate.type === 'percentage' ? 'Percentage' : 'Flat'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs tabular-nums">{rate.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            {rate.isCompound ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs">
                                <Layers className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGE[rate.status]?.variant || 'outline'}>
                              {STATUS_BADGE[rate.status]?.label || rate.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleRateStatus.mutate(rate)}
                                title={rate.status === 'active' ? 'Disable' : 'Enable'}
                              >
                                {rate.status === 'active' ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRate(rate)} title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => confirmDelete('rate', rate.id, rate.name)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tax Zones Tab ──────────────────────────────────────── */}
        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Assigned Rates</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : allZones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Globe className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>No tax zones found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allZones.map((zone) => {
                        let parsedIds: string[] = []
                        try { parsedIds = JSON.parse(zone.taxRateIds) } catch { /* empty */ }
                        const assignedRateNames = parsedIds
                          .map((id) => allRates.find((r) => r.id === id)?.name)
                          .filter(Boolean)

                        return (
                          <TableRow key={zone.id} className="group">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {zone.name}
                              </div>
                            </TableCell>
                            <TableCell>{zone.country || '—'}</TableCell>
                            <TableCell>{zone.state || '—'}</TableCell>
                            <TableCell>{zone.city || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {assignedRateNames.length > 0 ? (
                                  assignedRateNames.map((name) => (
                                    <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {zone.isDefault ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
                                  Default
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_BADGE[zone.status]?.variant || 'outline'}>
                                {STATUS_BADGE[zone.status]?.label || zone.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditZone(zone)} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => confirmDelete('zone', zone.id, zone.name)}
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
        </TabsContent>
      </Tabs>

      {/* ─── Rate Dialog ─────────────────────────────────────────── */}
      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Tax Rate' : 'Create Tax Rate'}</DialogTitle>
            <DialogDescription>
              {editingRate ? 'Modify the tax rate details' : 'Define a new tax rate to apply on invoices'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. GST, VAT, Service Tax"
                value={rateForm.name}
                onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Rate</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="18"
                    value={rateForm.rate}
                    onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {rateForm.type === 'percentage' ? '%' : '$'}
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={rateForm.type} onValueChange={(v) => setRateForm({ ...rateForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Input
                type="number"
                placeholder="0"
                value={rateForm.priority}
                onChange={(e) => setRateForm({ ...rateForm, priority: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Higher priority taxes are applied first</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Compound Tax</Label>
                <p className="text-[11px] text-muted-foreground">Applied on top of other taxes</p>
              </div>
              <Switch
                checked={rateForm.isCompound}
                onCheckedChange={(v) => setRateForm({ ...rateForm, isCompound: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRateDialog}>Cancel</Button>
            <Button onClick={submitRate} disabled={isSubmittingRate}>
              {isSubmittingRate ? 'Saving...' : editingRate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Zone Dialog ─────────────────────────────────────────── */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Tax Zone' : 'Create Tax Zone'}</DialogTitle>
            <DialogDescription>
              {editingZone ? 'Modify the tax zone configuration' : 'Define a geographical tax zone and assign rates'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Zone Name</Label>
              <Input
                placeholder="e.g. North America, EU Zone"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input
                  placeholder="US"
                  value={zoneForm.country}
                  onChange={(e) => setZoneForm({ ...zoneForm, country: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input
                  placeholder="CA"
                  value={zoneForm.state}
                  onChange={(e) => setZoneForm({ ...zoneForm, state: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>City</Label>
                <Input
                  placeholder="LA"
                  value={zoneForm.city}
                  onChange={(e) => setZoneForm({ ...zoneForm, city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assign Tax Rates</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {allRates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No tax rates available</p>
                ) : (
                  allRates.map((rate) => (
                    <label key={rate.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={zoneForm.taxRateIds.includes(rate.id)}
                        onCheckedChange={() => toggleZoneRateId(rate.id)}
                      />
                      <span className="text-sm flex-1">{rate.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {rate.type === 'percentage' ? `${rate.rate}%` : `$${rate.rate}`}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Default Zone</Label>
                <p className="text-[11px] text-muted-foreground">Applied when no zone matches</p>
              </div>
              <Switch
                checked={zoneForm.isDefault}
                onCheckedChange={(v) => setZoneForm({ ...zoneForm, isDefault: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeZoneDialog}>Cancel</Button>
            <Button onClick={submitZone} disabled={isSubmittingZone}>
              {isSubmittingZone ? 'Saving...' : editingZone ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ───────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'rate' ? 'Tax Rate' : 'Tax Zone'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return
                if (deleteTarget.type === 'rate') deleteRateMutation.mutate(deleteTarget.id)
                else deleteZoneMutation.mutate(deleteTarget.id)
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
