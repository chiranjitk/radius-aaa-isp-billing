'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Server,
  Globe,
  Clock,
  Download,
  Upload,
  Gauge,
  FileText,
  Shield,
  ExternalLink,
  Loader2,
  Settings,
  LayoutGrid,
  List,
  MoreHorizontal,
  Copy,
  Check,
  Image,
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
import { Switch } from '@/components/ui/switch'
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

interface HotspotLocation {
  id: string
  name: string
  description: string | null
  nasId: string | null
  nasName: string | null
  nasIpAddress: string | null
  nasStatus: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  splashPageUrl: string | null
  logoUrl: string | null
  welcomeMsg: string | null
  termsOfService: string | null
  bandwidthLimitDown: number | null
  bandwidthLimitUp: number | null
  sessionTimeout: number | null
  dailyDataLimit: number | null
  allowFreeAccess: boolean
  freeDataLimit: number | null
  freeTimeLimit: number | null
  walledGardenSites: string | null
  status: string
  totalVouchers: number
  createdAt: string
  updatedAt: string
}

interface HotspotStats {
  totalLocations: number
  activeLocations: number
  totalVouchers: number
  activeSessions: number
}

interface NasDevice {
  id: string
  nasName: string
  ipAddress: string
  status: string
}

interface LocationFormData {
  name: string
  description: string
  nasId: string
  address: string
  latitude: string
  longitude: string
  splashPageUrl: string
  logoUrl: string
  welcomeMsg: string
  termsOfService: string
  bandwidthLimitDown: string
  bandwidthLimitUp: string
  sessionTimeout: string
  dailyDataLimit: string
  allowFreeAccess: boolean
  freeDataLimit: string
  freeTimeLimit: string
  walledGardenSites: string
  status: string
}

const emptyForm: LocationFormData = {
  name: '',
  description: '',
  nasId: '',
  address: '',
  latitude: '',
  longitude: '',
  splashPageUrl: '',
  logoUrl: '',
  welcomeMsg: '',
  termsOfService: '',
  bandwidthLimitDown: '',
  bandwidthLimitUp: '',
  sessionTimeout: '',
  dailyDataLimit: '',
  allowFreeAccess: false,
  freeDataLimit: '',
  freeTimeLimit: '',
  walledGardenSites: '',
  status: 'active',
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function StatusDot({ status }: { status: string }) {
  const config = {
    active: 'bg-emerald-500',
    inactive: 'bg-zinc-400',
    maintenance: 'bg-amber-500',
    disabled: 'bg-red-500',
  }
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'active' && <span className="pulse-ring bg-emerald-500" />}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2.5 w-2.5',
          config[status as keyof typeof config] || 'bg-zinc-400'
        )}
      />
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
    inactive: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/25',
    maintenance: 'bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400',
    disabled: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400',
  }
  const labels = { active: 'Active', inactive: 'Inactive', maintenance: 'Maintenance', disabled: 'Disabled' }
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[11px] font-medium px-2 py-0.5',
        config[status as keyof typeof config] || config.inactive
      )}
    >
      <span className="flex items-center gap-1.5">
        <StatusDot status={status} />
        {labels[status as keyof typeof labels] || status}
      </span>
    </Badge>
  )
}

function NasStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 text-muted-foreground">No NAS</Badge>
  const config = {
    up: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
    down: 'bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400',
    disabled: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/25',
  }
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5', config[status as keyof typeof config] || config.disabled)}>
      {status === 'up' ? 'Online' : status === 'down' ? 'Offline' : 'Disabled'}
    </Badge>
  )
}

function formatBandwidth(kbps: number | null): string {
  if (!kbps) return 'No limit'
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`
  return `${kbps} Kbps`
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function HotspotView() {
  const queryClient = useQueryClient()

  // UI state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<HotspotLocation | null>(null)
  const [deletingLocation, setDeletingLocation] = useState<HotspotLocation | null>(null)
  const [formData, setFormData] = useState<LocationFormData>(emptyForm)

  // ==========================================
  // QUERIES
  // ==========================================

  const { data, isLoading, isError } = useQuery<{
    locations: HotspotLocation[]
    pagination: { page: number; limit: number; total: number; pages: number }
    stats: HotspotStats
  }>({
    queryKey: ['hotspot-locations', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '50')
      const res = await fetch(`/api/hotspot?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch hotspot locations')
      return res.json()
    },
    staleTime: 30000,
  })

  // Fetch NAS devices for dropdown
  const { data: nasDevices } = useQuery<{ devices: NasDevice[] }>({
    queryKey: ['nas-devices-list'],
    queryFn: async () => {
      const res = await fetch('/api/nas?limit=200')
      if (!res.ok) throw new Error('Failed to fetch NAS devices')
      return res.json()
    },
    staleTime: 60000,
  })

  const stats = data?.stats

  // ==========================================
  // MUTATIONS
  // ==========================================

  const createMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const res = await fetch('/api/hotspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create hotspot location')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Hotspot location created successfully')
      queryClient.invalidateQueries({ queryKey: ['hotspot-locations'] })
      closeDialog()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LocationFormData> }) => {
      const res = await fetch(`/api/hotspot/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update hotspot location')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Hotspot location updated successfully')
      queryClient.invalidateQueries({ queryKey: ['hotspot-locations'] })
      closeDialog()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hotspot/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete hotspot location')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Hotspot location deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['hotspot-locations'] })
      setDeleteDialogOpen(false)
      setDeletingLocation(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // ==========================================
  // HANDLERS
  // ==========================================

  const openCreateDialog = () => {
    setEditingLocation(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (loc: HotspotLocation) => {
    setEditingLocation(loc)
    setFormData({
      name: loc.name,
      description: loc.description || '',
      nasId: loc.nasId || '',
      address: loc.address || '',
      latitude: loc.latitude?.toString() || '',
      longitude: loc.longitude?.toString() || '',
      splashPageUrl: loc.splashPageUrl || '',
      logoUrl: loc.logoUrl || '',
      welcomeMsg: loc.welcomeMsg || '',
      termsOfService: loc.termsOfService || '',
      bandwidthLimitDown: loc.bandwidthLimitDown?.toString() || '',
      bandwidthLimitUp: loc.bandwidthLimitUp?.toString() || '',
      sessionTimeout: loc.sessionTimeout?.toString() || '',
      dailyDataLimit: loc.dailyDataLimit?.toString() || '',
      allowFreeAccess: loc.allowFreeAccess,
      freeDataLimit: loc.freeDataLimit?.toString() || '',
      freeTimeLimit: loc.freeTimeLimit?.toString() || '',
      walledGardenSites: loc.walledGardenSites || '',
      status: loc.status,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingLocation(null)
    setFormData(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (loc: HotspotLocation) => {
    setDeletingLocation(loc)
    setDeleteDialogOpen(true)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="hidden sm:flex"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="hidden sm:flex"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        {/* Stats Row */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold stat-number">{stats.totalLocations}</p>
                    <p className="text-xs text-muted-foreground">Total Locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
                    <Wifi className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600 stat-number">{stats.activeLocations}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/10">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600 stat-number">{stats.totalVouchers}</p>
                    <p className="text-xs text-muted-foreground">Total Vouchers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-teal-500/10">
                    <Gauge className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-600 stat-number">{stats.activeSessions}</p>
                    <p className="text-xs text-muted-foreground">Active Sessions</p>
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
                  placeholder="Search by name, address, description..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9 w-full sm:w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">Failed to load hotspot locations</h3>
              <p className="text-sm text-muted-foreground mb-4">There was an error fetching locations.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['hotspot-locations'] })}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.locations.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No hotspot locations found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || statusFilter ? 'Try adjusting your filters.' : 'Get started by adding your first hotspot location.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(search || statusFilter) && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('') }}>
                    Clear Filters
                  </Button>
                )}
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.locations.map((loc, idx) => (
              <div key={loc.id} className={cn('animate-fade-in-up', ['stagger-1','stagger-2','stagger-3','stagger-4','stagger-5','stagger-6'][idx % 6])}>
                <HotspotCard
                  location={loc}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">NAS</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Address</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Bandwidth</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Session Timeout</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.locations.map((loc) => (
                    <tr key={loc.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{loc.name}</p>
                          {loc.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{loc.description}</p>}
                        </div>
                      </td>
                      <td className="p-3">
                        {loc.nasName ? (
                          <div>
                            <p className="font-medium text-xs">{loc.nasName}</p>
                            <p className="text-[11px] text-muted-foreground">{loc.nasIpAddress}</p>
                            <NasStatusBadge status={loc.nasStatus} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not linked</span>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{loc.address || '—'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <StatusBadge status={loc.status} />
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Download className="h-3 w-3" />
                          {formatBandwidth(loc.bandwidthLimitDown)}
                          <span className="mx-0.5">/</span>
                          <Upload className="h-3 w-3" />
                          {formatBandwidth(loc.bandwidthLimitUp)}
                        </div>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {loc.sessionTimeout ? `${loc.sessionTimeout} min` : 'No limit'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(loc)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(loc)}>
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

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLocation ? 'Edit Hotspot Location' : 'Add Hotspot Location'}</DialogTitle>
              <DialogDescription>
                {editingLocation
                  ? `Editing ${editingLocation.name}`
                  : 'Configure a new captive portal hotspot zone'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
                  <TabsTrigger value="bandwidth" className="text-xs">Bandwidth</TabsTrigger>
                  <TabsTrigger value="free" className="text-xs">Free Access</TabsTrigger>
                  <TabsTrigger value="splash" className="text-xs">Splash Page</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loc-name">Location Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="loc-name"
                        placeholder="Main Lobby WiFi"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-status">Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loc-nas">NAS Device</Label>
                    <Select value={formData.nasId || 'none'} onValueChange={(v) => setFormData({ ...formData, nasId: v === 'none' ? '' : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select NAS device" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No NAS linked</SelectItem>
                        {(nasDevices?.devices || []).map((nas) => (
                          <SelectItem key={nas.id} value={nas.id}>
                            {nas.nasName} ({nas.ipAddress})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loc-address">Physical Address</Label>
                    <Input
                      id="loc-address"
                      placeholder="123 Main St, Building A, Floor 2"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loc-lat">Latitude</Label>
                      <Input
                        id="loc-lat"
                        type="number"
                        step="any"
                        placeholder="40.7128"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-lng">Longitude</Label>
                      <Input
                        id="loc-lng"
                        type="number"
                        step="any"
                        placeholder="-74.0060"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loc-desc">Description</Label>
                    <Textarea
                      id="loc-desc"
                      placeholder="Main lobby hotspot for hotel guests..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="bandwidth" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loc-bw-down">Download Limit (Kbps)</Label>
                      <Input
                        id="loc-bw-down"
                        type="number"
                        placeholder="0 = no limit"
                        value={formData.bandwidthLimitDown}
                        onChange={(e) => setFormData({ ...formData, bandwidthLimitDown: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-bw-up">Upload Limit (Kbps)</Label>
                      <Input
                        id="loc-bw-up"
                        type="number"
                        placeholder="0 = no limit"
                        value={formData.bandwidthLimitUp}
                        onChange={(e) => setFormData({ ...formData, bandwidthLimitUp: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loc-session">Session Timeout (minutes)</Label>
                      <Input
                        id="loc-session"
                        type="number"
                        placeholder="0 = no limit"
                        value={formData.sessionTimeout}
                        onChange={(e) => setFormData({ ...formData, sessionTimeout: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-data">Daily Data Limit (MB)</Label>
                      <Input
                        id="loc-data"
                        type="number"
                        placeholder="0 = no limit"
                        value={formData.dailyDataLimit}
                        onChange={(e) => setFormData({ ...formData, dailyDataLimit: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="free" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Allow Free Access</Label>
                      <p className="text-xs text-muted-foreground">Enable free internet access without voucher</p>
                    </div>
                    <Switch
                      checked={formData.allowFreeAccess}
                      onCheckedChange={(v) => setFormData({ ...formData, allowFreeAccess: v })}
                    />
                  </div>

                  {formData.allowFreeAccess && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="loc-free-data">Free Data Limit (MB)</Label>
                          <Input
                            id="loc-free-data"
                            type="number"
                            placeholder="0 = no limit"
                            value={formData.freeDataLimit}
                            onChange={(e) => setFormData({ ...formData, freeDataLimit: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loc-free-time">Free Time Limit (minutes)</Label>
                          <Input
                            id="loc-free-time"
                            type="number"
                            placeholder="0 = no limit"
                            value={formData.freeTimeLimit}
                            onChange={(e) => setFormData({ ...formData, freeTimeLimit: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="splash" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="loc-splash">Splash Page URL</Label>
                    <Input
                      id="loc-splash"
                      placeholder="https://portal.example.com/login"
                      value={formData.splashPageUrl}
                      onChange={(e) => setFormData({ ...formData, splashPageUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-logo">Logo URL</Label>
                    <Input
                      id="loc-logo"
                      placeholder="https://example.com/logo.png"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-welcome">Welcome Message</Label>
                    <Textarea
                      id="loc-welcome"
                      placeholder="Welcome to our WiFi! Enjoy your stay."
                      value={formData.welcomeMsg}
                      onChange={(e) => setFormData({ ...formData, welcomeMsg: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-tos">Terms of Service</Label>
                    <Textarea
                      id="loc-tos"
                      placeholder="By connecting to this network, you agree to our terms of service..."
                      value={formData.termsOfService}
                      onChange={(e) => setFormData({ ...formData, termsOfService: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-walled">Walled Garden Sites</Label>
                    <Textarea
                      id="loc-walled"
                      placeholder="example.com, safe-site.org (one per line)"
                      value={formData.walledGardenSites}
                      onChange={(e) => setFormData({ ...formData, walledGardenSites: e.target.value })}
                      rows={2}
                    />
                    <p className="text-[11px] text-muted-foreground">Sites accessible without authentication (one per line)</p>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Location</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deletingLocation?.name}</strong>?
                This action cannot be undone. All associated vouchers will be unlinked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingLocation && deleteMutation.mutate(deletingLocation.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

// ==========================================
// HOTSPOT CARD COMPONENT
// ==========================================

function HotspotCard({
  location,
  onEdit,
  onDelete,
}: {
  location: HotspotLocation
  onEdit: (loc: HotspotLocation) => void
  onDelete: (loc: HotspotLocation) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border shadow-sm hover-lift transition-all duration-200 group">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
              location.status === 'active'
                ? 'bg-emerald-500/10'
                : location.status === 'maintenance'
                  ? 'bg-amber-500/10'
                  : 'bg-zinc-500/10'
            )}>
              <MapPin className={cn(
                'h-5 w-5',
                location.status === 'active'
                  ? 'text-emerald-600'
                  : location.status === 'maintenance'
                    ? 'text-amber-600'
                    : 'text-zinc-500'
              )} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{location.name}</CardTitle>
              {location.address && (
                <CardDescription className="text-[11px] truncate mt-0.5">
                  {location.address}
                </CardDescription>
              )}
            </div>
          </div>
          <StatusBadge status={location.status} />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        {location.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{location.description}</p>
        )}

        {/* NAS Info */}
        <div className="flex items-center gap-2 text-xs">
          <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {location.nasName ? (
            <span className="truncate">{location.nasName} ({location.nasIpAddress})</span>
          ) : (
            <span className="text-muted-foreground">No NAS linked</span>
          )}
          {location.nasStatus && (
            <span className="ml-auto">
              <NasStatusBadge status={location.nasStatus} />
            </span>
          )}
        </div>

        {/* Bandwidth & Session Info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5">
            <Download className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatBandwidth(location.bandwidthLimitDown)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5">
            <Upload className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatBandwidth(location.bandwidthLimitUp)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{location.sessionTimeout ? `${location.sessionTimeout} min session` : 'No session limit'}</span>
          {location.dailyDataLimit && (
            <>
              <span className="text-border">|</span>
              <Gauge className="h-3.5 w-3.5 shrink-0" />
              <span>{location.dailyDataLimit} MB/day</span>
            </>
          )}
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {location.allowFreeAccess && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Free Access
            </Badge>
          )}
          {location.splashPageUrl && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Custom Splash
            </Badge>
          )}
          {location.totalVouchers > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {location.totalVouchers} voucher{location.totalVouchers !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <Separator />
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(location)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Location</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(location)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Location</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}
