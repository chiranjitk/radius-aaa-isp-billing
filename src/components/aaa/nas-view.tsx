'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Server,
  Plus,
  Search,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Power,
  Globe,
  MapPin,
  User,
  Activity,
  Router,
  Radio,
  MonitorSmartphone,
  Zap,
  Clock,
  Hash,
  ChevronDown,
  LayoutGrid,
  ArrowUpDown,
  Copy,
  Plug,
  Loader2,
  MoreHorizontal,
  ExternalLink,
  Shield,
  Info,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ==========================================
// TYPES
// ==========================================

interface NasDevice {
  id: string
  nasName: string
  shortName: string | null
  nasType: string
  ipAddress: string
  ports: number
  secret: string
  server: string | null
  community: string | null
  description: string | null
  status: string
  lastAlive: string | null
  vendor: string | null
  model: string | null
  location: string | null
  contact: string | null
  createdAt: string
  updatedAt: string
  activeSessions: number
}

interface NasStats {
  total: number
  online: number
  offline: number
  totalActiveSessions: number
}

interface VendorTemplate {
  id: string
  name: string
  type: string
  vendor: string
  description: string
  defaults: Partial<NasFormData>
  icon: React.ElementType
  color: string
}

// ==========================================
// CONSTANTS
// ==========================================

const NAS_TYPES = [
  { value: 'cisco', label: 'Cisco' },
  { value: 'juniper', label: 'Juniper' },
  { value: 'mikrotik', label: 'MikroTik' },
  { value: 'huawei', label: 'Huawei' },
  { value: 'aruba', label: 'Aruba' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'up', label: 'Online' },
  { value: 'down', label: 'Offline' },
  { value: 'disabled', label: 'Disabled' },
]

const VENDOR_TEMPLATES: VendorTemplate[] = [
  {
    id: 'cisco-ios',
    name: 'Cisco IOS',
    type: 'cisco',
    vendor: 'Cisco Systems',
    description: 'Enterprise Catalyst & ISR routers/switches',
    defaults: {
      nasType: 'cisco',
      vendor: 'Cisco Systems',
      ports: '48',
      server: '',
      community: 'public',
    },
    icon: Router,
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  },
  {
    id: 'juniper-junos',
    name: 'Juniper JunOS',
    type: 'juniper',
    vendor: 'Juniper Networks',
    description: 'EX/MX series switches and routers',
    defaults: {
      nasType: 'juniper',
      vendor: 'Juniper Networks',
      ports: '48',
      server: '',
      community: 'public',
    },
    icon: Radio,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  },
  {
    id: 'mikrotik-routeros',
    name: 'MikroTik RouterOS',
    type: 'mikrotik',
    vendor: 'MikroTik',
    description: 'CCR/hAP/rb series routers & APs',
    defaults: {
      nasType: 'mikrotik',
      vendor: 'MikroTik',
      ports: '10',
      server: '',
      community: 'public',
    },
    icon: Wifi,
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  {
    id: 'huawei-vrp',
    name: 'Huawei VRP',
    type: 'huawei',
    vendor: 'Huawei',
    description: 'S/CE/AR series enterprise switches',
    defaults: {
      nasType: 'huawei',
      vendor: 'Huawei',
      ports: '48',
      server: '',
      community: 'public',
    },
    icon: MonitorSmartphone,
    color: 'text-red-400 bg-red-400/10 border-red-400/20',
  },
  {
    id: 'arubaos',
    name: 'ArubaOS',
    type: 'aruba',
    vendor: 'Aruba Networks',
    description: 'Aruba wireless controllers & APs',
    defaults: {
      nasType: 'aruba',
      vendor: 'Aruba Networks',
      ports: '0',
      server: '',
      community: 'public',
    },
    icon: Zap,
    color: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  },
]

const VENDOR_TYPE_MAP: Record<string, string> = {
  cisco: 'Cisco Systems',
  juniper: 'Juniper Networks',
  mikrotik: 'MikroTik',
  huawei: 'Huawei',
  aruba: 'Aruba Networks',
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function StatusDot({ status }: { status: string }) {
  const config = {
    up: 'bg-emerald-500',
    down: 'bg-red-500',
    disabled: 'bg-zinc-400',
  }
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'up' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
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
    up: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
    down: 'bg-red-500/15 text-red-600 border-red-500/25',
    disabled: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/25',
  }
  const labels = { up: 'Online', down: 'Offline', disabled: 'Disabled' }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[11px] font-medium px-2 py-0.5',
        config[status as keyof typeof config] || config.disabled
      )}
    >
      <span className="flex items-center gap-1.5">
        <StatusDot status={status} />
        {labels[status as keyof typeof labels] || 'Unknown'}
      </span>
    </Badge>
  )
}

function VendorBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    cisco: 'bg-blue-500/15 text-blue-600 border-blue-500/25',
    juniper: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
    mikrotik: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
    huawei: 'bg-red-500/15 text-red-600 border-red-500/25',
    aruba: 'bg-violet-500/15 text-violet-600 border-violet-500/25',
    other: 'bg-zinc-500/15 text-zinc-600 border-zinc-500/25',
  }

  const labels: Record<string, string> = {
    cisco: 'Cisco',
    juniper: 'Juniper',
    mikrotik: 'MikroTik',
    huawei: 'Huawei',
    aruba: 'Aruba',
    other: 'Other',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[11px] font-medium px-2 py-0.5',
        colors[type] || colors.other
      )}
    >
      {labels[type] || type}
    </Badge>
  )
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ==========================================
// MAIN COMPONENT
// ==========================================

interface NasFormData {
  nasName: string
  shortName: string
  nasType: string
  ipAddress: string
  ports: string
  secret: string
  server: string
  community: string
  description: string
  vendor: string
  model: string
  location: string
  contact: string
}

const emptyForm: NasFormData = {
  nasName: '',
  shortName: '',
  nasType: 'other',
  ipAddress: '',
  ports: '0',
  secret: '',
  server: '',
  community: '',
  description: '',
  vendor: '',
  model: '',
  location: '',
  contact: '',
}

export function NasView() {
  const queryClient = useQueryClient()

  // UI state
  const [search, setSearch] = useState('')
  const [vendorType, setVendorType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<NasDevice | null>(null)
  const [deletingDevice, setDeletingDevice] = useState<NasDevice | null>(null)
  const [formData, setFormData] = useState<NasFormData>(emptyForm)

  // ==========================================
  // QUERIES
  // ==========================================

  const { data, isLoading, isError } = useQuery<{
    devices: NasDevice[]
    pagination: { page: number; limit: number; total: number; pages: number }
    stats: NasStats
  }>({
    queryKey: ['nas-devices', search, vendorType, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (vendorType) params.set('vendorType', vendorType)
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '20')

      const res = await fetch(`/api/nas?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to fetch NAS devices')
      }
      return res.json()
    },
    staleTime: 30000,
  })

  const stats = data?.stats

  // ==========================================
  // MUTATIONS
  // ==========================================

  const createMutation = useMutation({
    mutationFn: async (data: NasFormData) => {
      const res = await fetch('/api/nas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create NAS device')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('NAS device created successfully')
      queryClient.invalidateQueries({ queryKey: ['nas-devices'] })
      closeDialog()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NasFormData> }) => {
      const res = await fetch(`/api/nas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update NAS device')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('NAS device updated successfully')
      queryClient.invalidateQueries({ queryKey: ['nas-devices'] })
      closeDialog()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/nas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete NAS device')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('NAS device deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['nas-devices'] })
      setDeleteDialogOpen(false)
      setDeletingDevice(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // ==========================================
  // HANDLERS
  // ==========================================

  const openCreateDialog = () => {
    setEditingDevice(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (device: NasDevice) => {
    setEditingDevice(device)
    setFormData({
      nasName: device.nasName,
      shortName: device.shortName || '',
      nasType: device.nasType,
      ipAddress: device.ipAddress,
      ports: device.ports?.toString() || '0',
      secret: device.secret,
      server: device.server || '',
      community: device.community || '',
      description: device.description || '',
      vendor: device.vendor || '',
      model: device.model || '',
      location: device.location || '',
      contact: device.contact || '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingDevice(null)
    setFormData(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (device: NasDevice) => {
    setDeletingDevice(device)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (deletingDevice) {
      deleteMutation.mutate(deletingDevice.id)
    }
  }

  const handleTemplateApply = (template: VendorTemplate) => {
    setFormData((prev) => ({
      ...prev,
      ...template.defaults,
    }))
    setTemplateDialogOpen(false)
    toast.info(`Applied ${template.name} template defaults`)
  }

  const handleTestConnection = (device: NasDevice) => {
    toast.info(`Testing connection to ${device.nasName} (${device.ipAddress})...`, {
      description: 'This is a mock test. RADIUS connectivity check would run here.',
      duration: 3000,
    })
    setTimeout(() => {
      if (device.status === 'up') {
        toast.success(`${device.nasName}: Connection OK — RADIUS responding`, {
          description: `Round-trip: ${Math.floor(Math.random() * 20 + 2)}ms`,
        })
      } else {
        toast.error(`${device.nasName}: Connection failed — No response`, {
          description: 'Check network connectivity and RADIUS configuration.',
        })
      }
    }, 1500)
  }

  const handleTypeChange = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      nasType: type,
      vendor: prev.vendor || VENDOR_TYPE_MAP[type] || '',
    }))
  }

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleVendorTypeChange = (value: string) => {
    setVendorType(value === 'all' ? '' : value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ========== HEADER ========== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Server className="h-6 w-6" />
              NAS Devices
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage network access servers and RADIUS clients
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateDialogOpen(true)}
              className="hidden sm:flex"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add NAS Device
            </Button>
          </div>
        </div>

        {/* ========== STATS ROW ========== */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total NAS</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
                    <Wifi className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{stats.online}</p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-500/10">
                    <WifiOff className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
                    <p className="text-xs text-muted-foreground">Offline</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/10">
                    <Activity className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{stats.totalActiveSessions}</p>
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

        {/* ========== FILTER BAR ========== */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, IP, vendor, model, location..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={vendorType || 'all'} onValueChange={handleVendorTypeChange}>
                  <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {NAS_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 w-full sm:w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value || 'all'} value={s.value || 'all'}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== NAS CARDS GRID ========== */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Separator />
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">Failed to load NAS devices</h3>
              <p className="text-sm text-muted-foreground">
                There was an error fetching NAS devices. Please try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['nas-devices'] })}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.devices.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No NAS devices found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || vendorType || statusFilter
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first NAS device.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(search || vendorType || statusFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setVendorType('')
                      setStatusFilter('')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add NAS Device
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.devices.map((device) => (
                <NasCard
                  key={device.id}
                  device={device}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onTest={handleTestConnection}
                />
              ))}
            </div>

            {/* PAGINATION */}
            {data?.pagination && data.pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  Page {data.pagination.page} of {data.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* ========== ADD/EDIT DIALOG ========== */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDevice ? 'Edit NAS Device' : 'Add NAS Device'}
              </DialogTitle>
              <DialogDescription>
                {editingDevice
                  ? `Editing ${editingDevice.nasName}`
                  : 'Add a new network access server to your RADIUS infrastructure'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NAS Name */}
                <div className="space-y-2">
                  <Label htmlFor="nasName">
                    NAS Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nasName"
                    placeholder="DC1-CORE-01"
                    value={formData.nasName}
                    onChange={(e) => setFormData({ ...formData, nasName: e.target.value })}
                    required
                  />
                </div>

                {/* Short Name */}
                <div className="space-y-2">
                  <Label htmlFor="shortName">Short Name</Label>
                  <Input
                    id="shortName"
                    placeholder="dc1-core"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NAS Type */}
                <div className="space-y-2">
                  <Label htmlFor="nasType">NAS Type</Label>
                  <Select value={formData.nasType} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {NAS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.nasType && VENDOR_TYPE_MAP[formData.nasType] && !formData.vendor && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Suggested vendor: {VENDOR_TYPE_MAP[formData.nasType]}
                    </p>
                  )}
                </div>

                {/* IP Address */}
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">
                    IP Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ipAddress"
                    placeholder="10.0.1.1"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Secret */}
                <div className="space-y-2">
                  <Label htmlFor="secret">
                    RADIUS Secret <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="secret"
                    type="password"
                    placeholder="Shared secret"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    required
                  />
                </div>

                {/* Ports */}
                <div className="space-y-2">
                  <Label htmlFor="ports">Total Ports</Label>
                  <Input
                    id="ports"
                    type="number"
                    placeholder="0"
                    value={formData.ports}
                    onChange={(e) => setFormData({ ...formData, ports: e.target.value })}
                    min={0}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Server */}
                <div className="space-y-2">
                  <Label htmlFor="server">RADIUS Server</Label>
                  <Input
                    id="server"
                    placeholder="10.0.1.254"
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                  />
                </div>

                {/* Community */}
                <div className="space-y-2">
                  <Label htmlFor="community">SNMP Community</Label>
                  <Input
                    id="community"
                    placeholder="public"
                    value={formData.community}
                    onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vendor */}
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    placeholder="Cisco Systems"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="Catalyst 9300-48T"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Primary data center core switch"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="US-East DC1, Rack A12"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Person</Label>
                  <Input
                    id="contact"
                    placeholder="netops@company.com"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingDevice ? 'Save Changes' : 'Create NAS Device'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ========== DELETE DIALOG ========== */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete NAS Device</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{' '}
                <strong>{deletingDevice?.nasName}</strong> ({deletingDevice?.ipAddress})?
                This action cannot be undone.
                {deletingDevice && deletingDevice.activeSessions > 0 && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    This device has {deletingDevice.activeSessions} active session(s).
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ========== VENDOR TEMPLATES DIALOG ========== */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vendor Templates</DialogTitle>
              <DialogDescription>
                Quickly add a NAS device using pre-configured vendor templates.
                Select a template to pre-fill common attributes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VENDOR_TEMPLATES.map((template) => {
                const Icon = template.icon
                return (
                  <Card
                    key={template.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border',
                      template.color
                    )}
                    onClick={() => handleTemplateApply(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-background/80 shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Type: {template.type}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Ports: {template.defaults.ports}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateDialogOpen(false)
                  openCreateDialog()
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Blank Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// ==========================================
// NAS CARD COMPONENT
// ==========================================

function NasCard({
  device,
  onEdit,
  onDelete,
  onTest,
}: {
  device: NasDevice
  onEdit: (device: NasDevice) => void
  onDelete: (device: NasDevice) => void
  onTest: (device: NasDevice) => void
}) {
  const borderColor =
    device.status === 'up'
      ? 'border-l-emerald-500'
      : device.status === 'down'
        ? 'border-l-red-500'
        : 'border-l-zinc-400'

  return (
    <Card
      className={cn(
        'border-l-4 shadow-sm transition-all hover:shadow-md group',
        borderColor
      )}
    >
      <CardContent className="p-4 md:p-5 space-y-3">
        {/* Header: Name + Short Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{device.nasName}</h3>
              {device.shortName && (
                <span className="text-xs text-muted-foreground font-mono">
                  ({device.shortName})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <VendorBadge type={device.nasType} />
              <StatusBadge status={device.status} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(device)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTest(device)}>
                <Plug className="h-4 w-4 mr-2" />
                Test Connection
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(device)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="font-mono truncate">{device.ipAddress}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(device.ipAddress)
                toast.success('IP address copied')
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3 w-3 shrink-0" />
            <span>{device.model || '—'}</span>
          </div>
          {device.location && (
            <div className="flex items-center gap-1.5 text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{device.location}</span>
            </div>
          )}
          {device.contact && (
            <div className="flex items-center gap-1.5 text-muted-foreground truncate">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{device.contact}</span>
            </div>
          )}
        </div>

        {device.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{device.description}</p>
        )}

        <Separator />

        {/* Footer: Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-amber-500" />
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{device.activeSessions}</span>{' '}
                sessions
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Server className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{device.ports}</span> ports
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(device.lastAlive)}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onEdit(device)}
          >
            <Pencil className="h-3 w-3 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onTest(device)}
          >
            <Plug className="h-3 w-3 mr-1.5" />
            Test
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(device)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
