'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Ticket,
  Plus,
  Search,
  Pencil,
  Trash2,
  Printer,
  Download,
  Upload,
  Gauge,
  Clock,
  Copy,
  Check,
  QrCode,
  Loader2,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  X,
  Zap,
  Database,
  Infinity,
  FileText,
  Package,
  Eye,
  Ban,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ==========================================
// TYPES
// ==========================================

interface Voucher {
  id: string
  code: string
  batchId: string | null
  locationId: string | null
  locationName: string | null
  planId: string | null
  username: string | null
  type: string
  value: number
  speedDown: number | null
  speedUp: number | null
  simultaneous: number
  status: string
  usedAt: string | null
  expiresAt: string | null
  macAddress: string | null
  printedAt: string | null
  createdAt: string
}

interface VoucherStats {
  total: number
  available: number
  used: number
  expired: number
}

interface HotspotLocation {
  id: string
  name: string
}

interface Plan {
  id: string
  name: string
}

interface PrintData {
  code: string
  type: string
  typeValue: string
  value: string
  speedInfo: string
  status: string
  expiresAt: string | null
  locationName: string
  locationAddress: string
  welcomeMsg: string
  createdAt: string
}

interface BatchFormData {
  locationId: string
  planId: string
  type: string
  value: string
  quantity: string
  expiresAt: string
  speedDown: string
  speedUp: string
  simultaneous: string
  prefix: string
}

const emptyBatchForm: BatchFormData = {
  locationId: '',
  planId: '',
  type: 'time',
  value: '',
  quantity: '10',
  expiresAt: '',
  speedDown: '',
  speedUp: '',
  simultaneous: '1',
  prefix: 'VC',
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function VoucherStatusBadge({ status }: { status: string }) {
  const config = {
    available: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
    used: 'bg-slate-500/15 text-slate-600 border-slate-500/25',
    expired: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400',
    disabled: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400',
  }
  const labels = { available: 'Available', used: 'Used', expired: 'Expired', disabled: 'Disabled' }
  return (
    <Badge
      variant="outline"
      className={cn('text-[11px] font-medium px-2 py-0.5', config[status as keyof typeof config] || config.available)}
    >
      {labels[status as keyof typeof labels] || status}
    </Badge>
  )
}

function VoucherTypeBadge({ type }: { type: string }) {
  const config = {
    time: 'bg-sky-500/15 text-sky-600 border-sky-500/25 dark:text-sky-400',
    data: 'bg-violet-500/15 text-violet-600 border-violet-500/25 dark:text-violet-400',
    unlimited: 'bg-teal-500/15 text-teal-600 border-teal-500/25 dark:text-teal-400',
  }
  const icons = { time: Clock, data: Database, unlimited: Infinity }
  const labels = { time: 'Time', data: 'Data', unlimited: 'Unlimited' }
  const Icon = icons[type as keyof typeof icons] || Ticket
  return (
    <Badge
      variant="outline"
      className={cn('text-[11px] font-medium px-2 py-0.5 gap-1', config[type as keyof typeof config] || config.time)}
    >
      <Icon className="h-3 w-3" />
      {labels[type as keyof typeof labels] || type}
    </Badge>
  )
}

function QrCodePlaceholder({ code }: { code: string }) {
  const [show, setShow] = useState(false)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShow(!show)}>
          <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {show ? code : 'Show QR code'}
      </TooltipContent>
    </Tooltip>
  )
}

function formatBandwidth(kbps: number | null): string {
  if (!kbps) return '—'
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`
  return `${kbps} Kbps`
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return 'Unknown'
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function VouchersView() {
  const queryClient = useQueryClient()

  // UI state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Dialog state
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [batchFormData, setBatchFormData] = useState<BatchFormData>(emptyBatchForm)
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null)
  const [selectedVouchers, setSelectedVouchers] = useState<Set<string>>(new Set())
  const [printData, setPrintData] = useState<PrintData[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  // ==========================================
  // QUERIES
  // ==========================================

  const { data, isLoading, isError } = useQuery<{
    vouchers: Voucher[]
    pagination: { page: number; limit: number; total: number; pages: number }
    stats: VoucherStats
  }>({
    queryKey: ['vouchers', search, statusFilter, locationFilter, typeFilter, batchFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (locationFilter) params.set('locationId', locationFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (batchFilter) params.set('batchId', batchFilter)
      params.set('page', page.toString())
      params.set('limit', '50')
      const res = await fetch(`/api/vouchers?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch vouchers')
      return res.json()
    },
    staleTime: 30000,
  })

  // Fetch hotspot locations for dropdown
  const { data: locationsData } = useQuery<{ locations: HotspotLocation[] }>({
    queryKey: ['hotspot-locations-list'],
    queryFn: async () => {
      const res = await fetch('/api/hotspot?limit=200')
      if (!res.ok) throw new Error('Failed to fetch locations')
      return res.json()
    },
    staleTime: 60000,
  })

  // Fetch plans for dropdown
  const { data: plansData } = useQuery<{ plans: Plan[] }>({
    queryKey: ['plans-list'],
    queryFn: async () => {
      const res = await fetch('/api/plans?limit=200')
      if (!res.ok) throw new Error('Failed to fetch plans')
      return res.json()
    },
    staleTime: 60000,
  })

  // Get unique batch IDs
  const batchIds = data?.vouchers
    ? [...new Set(data.vouchers.filter((v) => v.batchId).map((v) => v.batchId!))]
    : []

  const stats = data?.stats

  // ==========================================
  // MUTATIONS
  // ==========================================

  const batchCreateMutation = useMutation({
    mutationFn: async (data: BatchFormData) => {
      const res = await fetch('/api/vouchers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate vouchers')
      }
      return res.json()
    },
    onSuccess: (result) => {
      toast.success(`Successfully generated ${result.count} vouchers`)
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      setBatchDialogOpen(false)
      setBatchFormData(emptyBatchForm)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete voucher')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Voucher deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      setDeleteDialogOpen(false)
      setDeletingVoucher(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disabled' }),
      })
      if (!res.ok) throw new Error('Failed to disable voucher')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Voucher disabled')
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    batchCreateMutation.mutate(batchFormData)
  }

  const handleToggleSelect = (id: string) => {
    setSelectedVouchers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (!data?.vouchers) return
    if (selectedVouchers.size === data.vouchers.length) {
      setSelectedVouchers(new Set())
    } else {
      setSelectedVouchers(new Set(data.vouchers.map((v) => v.id)))
    }
  }

  const handlePrintSelected = async () => {
    const ids = Array.from(selectedVouchers)
    if (ids.length === 0) {
      toast.error('No vouchers selected for printing')
      return
    }

    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/vouchers/${id}/print`).then((r) => r.json()))
      )
      setPrintData(results.map((r) => r.voucher))
      setPrintDialogOpen(true)
    } catch {
      toast.error('Failed to load voucher data for printing')
    }
  }

  const handlePrintSingle = async (voucher: Voucher) => {
    try {
      const res = await fetch(`/api/vouchers/${voucher.id}/print`)
      if (!res.ok) throw new Error('Failed to fetch print data')
      const data = await res.json()
      setPrintData([data.voucher])
      setPrintDialogOpen(true)
    } catch {
      toast.error('Failed to load voucher for printing')
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Copied: ${code}`)
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-end gap-2">
          {selectedVouchers.size > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrintSelected} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Selected ({selectedVouchers.size})
            </Button>
          )}
          <Button size="sm" onClick={() => { setBatchFormData(emptyBatchForm); setBatchDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Vouchers
          </Button>
        </div>

        {/* Stats Row */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold stat-number">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Vouchers</p>
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
                    <p className="text-2xl font-bold text-emerald-600 stat-number">{stats.available}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-500/10">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-600 stat-number">{stats.used}</p>
                    <p className="text-xs text-muted-foreground">Used</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600 stat-number">{stats.expired}</p>
                    <p className="text-xs text-muted-foreground">Expired</p>
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code, username, MAC..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
                    <SelectTrigger className="h-9 w-full sm:w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter || 'all'} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
                    <SelectTrigger className="h-9 w-full sm:w-[120px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={locationFilter || 'all'} onValueChange={(v) => { setLocationFilter(v === 'all' ? '' : v); setPage(1) }}>
                    <SelectTrigger className="h-9 w-full sm:w-[150px]">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {(locationsData?.locations || []).map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {batchIds.length > 0 && (
                <Select value={batchFilter || 'all'} onValueChange={(v) => { setBatchFilter(v === 'all' ? '' : v); setPage(1) }}>
                  <SelectTrigger className="h-8 w-full sm:w-[250px]">
                    <SelectValue placeholder="Filter by batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batchIds.map((bid) => (
                      <SelectItem key={bid} value={bid}>{bid}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <Card className="border shadow-sm">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
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
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">Failed to load vouchers</h3>
              <p className="text-sm text-muted-foreground mb-4">There was an error fetching vouchers.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['vouchers'] })}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.vouchers.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No vouchers found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || statusFilter || typeFilter || locationFilter
                  ? 'Try adjusting your filters.'
                  : 'Generate your first batch of vouchers.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(search || statusFilter || typeFilter || locationFilter || batchFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setLocationFilter(''); setBatchFilter('') }}
                  >
                    Clear Filters
                  </Button>
                )}
                <Button size="sm" onClick={() => { setBatchFormData(emptyBatchForm); setBatchDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Vouchers
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-3 w-10">
                      <Checkbox
                        checked={data?.vouchers.length ? selectedVouchers.size === data.vouchers.length : false}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Batch</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Value</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Speed</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">Claimed By</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Expiry</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.vouchers.map((v) => (
                    <tr key={v.id} className={cn(
                      'border-b last:border-0 hover:bg-muted/20 transition-colors',
                      selectedVouchers.has(v.id) && 'bg-primary/5'
                    )}>
                      <td className="p-3">
                        <Checkbox
                          checked={selectedVouchers.has(v.id)}
                          onCheckedChange={() => handleToggleSelect(v.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted/60 px-1.5 py-0.5 rounded">{v.code}</code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(v.code)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy code</TooltipContent>
                          </Tooltip>
                          <QrCodePlaceholder code={v.code} />
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {v.batchId ? v.batchId.replace(/^BATCH-/, '').substring(0, 16) : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <VoucherTypeBadge type={v.type} />
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-xs font-medium">
                          {v.type === 'time' ? `${v.value} min` : v.type === 'data' ? `${v.value} MB` : '∞'}
                        </span>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {v.speedDown || v.speedUp ? `${formatBandwidth(v.speedDown)}↓ / ${formatBandwidth(v.speedUp)}↑` : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <VoucherStatusBadge status={v.status} />
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{v.locationName || '—'}</span>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">{v.username || '—'}</span>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{formatExpiry(v.expiresAt)}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePrintSingle(v)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Print</TooltipContent>
                          </Tooltip>
                          {v.status === 'available' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => disableMutation.mutate(v.id)}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Disable</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => { setDeletingVoucher(v); setDeleteDialogOpen(true) }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data?.vouchers.map((v) => (
              <VoucherCard key={v.id} voucher={v} onPrint={handlePrintSingle} onCopy={handleCopyCode} />
            ))}
          </div>
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

        {/* Batch Generate Dialog */}
        <Dialog open={batchDialogOpen} onOpenChange={(open) => !open && setBatchDialogOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Vouchers</DialogTitle>
              <DialogDescription>
                Batch generate access vouchers for your hotspot locations
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-location">Location</Label>
                  <Select value={batchFormData.locationId || 'any'} onValueChange={(v) => setBatchFormData({ ...batchFormData, locationId: v === 'any' ? '' : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Location</SelectItem>
                      {(locationsData?.locations || []).map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-plan">Plan (optional)</Label>
                  <Select value={batchFormData.planId || 'none'} onValueChange={(v) => setBatchFormData({ ...batchFormData, planId: v === 'none' ? '' : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="No plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Plan</SelectItem>
                      {(plansData?.plans || []).map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-type">Voucher Type</Label>
                  <Select value={batchFormData.type} onValueChange={(v) => setBatchFormData({ ...batchFormData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Time-Based</SelectItem>
                      <SelectItem value="data">Data-Based</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-qty">Quantity (1–500)</Label>
                  <Input
                    id="batch-qty"
                    type="number"
                    min={1}
                    max={500}
                    value={batchFormData.quantity}
                    onChange={(e) => setBatchFormData({ ...batchFormData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              {batchFormData.type !== 'unlimited' && (
                <div className="space-y-2">
                  <Label htmlFor="batch-value">
                    {batchFormData.type === 'time' ? 'Duration (minutes)' : 'Data Allowance (MB)'}
                  </Label>
                  <Input
                    id="batch-value"
                    type="number"
                    placeholder={batchFormData.type === 'time' ? 'e.g. 60 for 1 hour' : 'e.g. 1024 for 1 GB'}
                    value={batchFormData.value}
                    onChange={(e) => setBatchFormData({ ...batchFormData, value: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-speed-down">Speed Limit Down (Kbps)</Label>
                  <Input
                    id="batch-speed-down"
                    type="number"
                    placeholder="0 = no limit"
                    value={batchFormData.speedDown}
                    onChange={(e) => setBatchFormData({ ...batchFormData, speedDown: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-speed-up">Speed Limit Up (Kbps)</Label>
                  <Input
                    id="batch-speed-up"
                    type="number"
                    placeholder="0 = no limit"
                    value={batchFormData.speedUp}
                    onChange={(e) => setBatchFormData({ ...batchFormData, speedUp: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-expiry">Expiry Date</Label>
                  <Input
                    id="batch-expiry"
                    type="date"
                    value={batchFormData.expiresAt}
                    onChange={(e) => setBatchFormData({ ...batchFormData, expiresAt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-prefix">Code Prefix</Label>
                  <Input
                    id="batch-prefix"
                    placeholder="VC"
                    maxLength={6}
                    value={batchFormData.prefix}
                    onChange={(e) => setBatchFormData({ ...batchFormData, prefix: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <Separator />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBatchDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={batchCreateMutation.isPending}>
                  {batchCreateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate {batchFormData.quantity || '10'} Vouchers
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Voucher</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete voucher <code className="bg-muted px-1 rounded text-xs">{deletingVoucher?.code}</code>?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingVoucher && deleteMutation.mutate(deletingVoucher.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Print Dialog */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Print Vouchers</DialogTitle>
              <DialogDescription>
                {printData.length} voucher{printData.length !== 1 ? 's' : ''} ready for printing
              </DialogDescription>
            </DialogHeader>
            <div ref={printRef} className="space-y-4">
              {printData.map((v, idx) => (
                <Card key={idx} className="border-2 border-dashed print-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">WiFi Access Voucher</p>
                          <div className="flex items-center gap-2">
                            <code className="text-2xl font-bold font-mono tracking-wider">{v.code}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyCode(v.code)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium">{v.type} — {v.value}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Speed</p>
                            <p className="font-medium">{v.speedInfo}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">{v.locationName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Expires</p>
                            <p className="font-medium">{v.expiresAt ? format(new Date(v.expiresAt), 'MMM d, yyyy') : 'Never'}</p>
                          </div>
                        </div>
                        <Separator />
                        <p className="text-[11px] text-muted-foreground italic">{v.welcomeMsg}</p>
                      </div>
                      {/* QR Code Placeholder */}
                      <div className="flex flex-col items-center gap-1 ml-6">
                        <div className="w-24 h-24 border-2 border-border rounded-lg flex items-center justify-center bg-white dark:bg-muted/30">
                          <div className="text-center">
                            <QrCode className="h-10 w-10 mx-auto text-foreground/60" />
                            <p className="text-[8px] font-mono text-muted-foreground mt-1 break-all max-w-[80px]">{v.code.substring(0, 12)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Close</Button>
              <Button onClick={() => {
                window.print()
                toast.success('Print dialog opened')
              }}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// ==========================================
// VOUCHER CARD COMPONENT
// ==========================================

function VoucherCard({
  voucher,
  onPrint,
  onCopy,
}: {
  voucher: Voucher
  onPrint: (v: Voucher) => void
  onCopy: (code: string) => void
}) {
  const statusColors: Record<string, string> = {
    available: 'border-l-emerald-500',
    used: 'border-l-slate-400',
    expired: 'border-l-amber-500',
    disabled: 'border-l-red-500',
  }

  return (
    <Card className={cn('border shadow-sm border-l-4 transition-all hover-lift group', statusColors[voucher.status] || 'border-l-muted')}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <code className="text-sm font-bold font-mono bg-muted/60 px-2 py-0.5 rounded truncate">{voucher.code}</code>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onCopy(voucher.code)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>
          </div>
          <VoucherStatusBadge status={voucher.status} />
        </div>

        {/* QR Placeholder */}
        <div className="flex justify-center">
          <div className="w-20 h-20 border border-border rounded-lg flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <QrCode className="h-8 w-8 mx-auto text-foreground/40" />
              <p className="text-[7px] font-mono text-muted-foreground mt-0.5 break-all max-w-[70px]">{voucher.code.substring(0, 14)}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <VoucherTypeBadge type={voucher.type} />
            <span className="text-xs font-semibold">
              {voucher.type === 'time' ? `${voucher.value} min` : voucher.type === 'data' ? `${voucher.value} MB` : 'Unlimited'}
            </span>
          </div>

          {voucher.speedDown && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="h-3 w-3" />
              {formatBandwidth(voucher.speedDown)}↓ / {formatBandwidth(voucher.speedUp)}↑
            </div>
          )}

          {voucher.locationName && (
            <p className="text-[11px] text-muted-foreground truncate">{voucher.locationName}</p>
          )}

          {voucher.expiresAt && (
            <p className="text-[11px] text-muted-foreground">
              Expires: {formatExpiry(voucher.expiresAt)}
            </p>
          )}
        </div>

        {/* Actions */}
        <Separator />
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrint(voucher)}>
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}
