'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Shield,
  Plus,
  Search,
  X,
  Pencil,
  Copy,
  Trash2,
  Settings2,
  FileStack,
  Zap,
  Clock,
  Database,
  Lock,
  Flame,
  ListPlus,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clipboard,
  Download,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'
import { toast } from 'sonner'

// ==================== Constants ====================

const RADIUS_ATTRIBUTES = [
  'Session-Timeout',
  'Idle-Timeout',
  'Max-Daily-Session',
  'WISPr-Bandwidth-Max-Down',
  'WISPr-Bandwidth-Max-Up',
  'WISPr-Session-Terminate-Time',
  'Framed-Pool',
  'Framed-IP-Address',
  'Framed-Netmask',
  'Framed-Protocol',
  'Filter-Id',
  'Reply-Message',
  'Login-Time',
  'Simultaneous-Use',
  'Service-Type',
  'Tunnel-Type',
  'Tunnel-Medium-Type',
  'Tunnel-Private-Group-ID',
  'Mikrotik-Rate-Limit',
  'Mikrotik-Recv-Limit',
  'Mikrotik-Xmit-Limit',
  'ChilliSpot-Max-Total-Octets',
  'ChilliSpot-Max-Total-Octets-Daily',
  'CoovaChilli-Max-Total-Octets',
  'Cisco-AVPair',
  'Framed-Filter-Id',
  'Calling-Station-Id',
  'NAS-IP-Address',
  'NAS-Port',
  'NAS-Port-Type',
]

const OPERATORS = ['=', ':=', '==', '!=', '<', '>', '<=', '>=', '+=']

const POLICY_TYPES = [
  { value: 'bandwidth', label: 'Bandwidth', icon: Zap, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950' },
  { value: 'time', label: 'Time', icon: Clock, color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950' },
  { value: 'data', label: 'Data', icon: Database, color: 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950' },
  { value: 'access', label: 'Access Control', icon: Lock, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950' },
  { value: 'acl', label: 'ACL', icon: FileStack, color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950' },
  { value: 'firewall', label: 'Firewall', icon: Flame, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950' },
]

// Predefined templates
const POLICY_TEMPLATES = [
  {
    name: 'Bandwidth Limit 1Mbps',
    type: 'bandwidth',
    description: 'Limit download/upload to 1 Mbps',
    priority: 5,
    rules: [
      { name: 'Download Limit', attribute: 'WISPr-Bandwidth-Max-Down', operator: ':=', value: '1048576', description: '1 Mbps download cap', priority: 5 },
      { name: 'Upload Limit', attribute: 'WISPr-Bandwidth-Max-Up', operator: ':=', value: '1048576', description: '1 Mbps upload cap', priority: 5 },
      { name: 'Mikrotik Rate Limit', attribute: 'Mikrotik-Rate-Limit', operator: '=', value: '1M/1M', description: 'MikroTik rate limit string', priority: 5 },
    ],
  },
  {
    name: 'Bandwidth Limit 5Mbps',
    type: 'bandwidth',
    description: 'Limit download/upload to 5 Mbps',
    priority: 5,
    rules: [
      { name: 'Download Limit', attribute: 'WISPr-Bandwidth-Max-Down', operator: ':=', value: '5242880', description: '5 Mbps download cap', priority: 5 },
      { name: 'Upload Limit', attribute: 'WISPr-Bandwidth-Max-Up', operator: ':=', value: '5242880', description: '5 Mbps upload cap', priority: 5 },
      { name: 'Mikrotik Rate Limit', attribute: 'Mikrotik-Rate-Limit', operator: '=', value: '5M/5M', description: 'MikroTik rate limit string', priority: 5 },
    ],
  },
  {
    name: 'Time Limit 2h',
    type: 'time',
    description: 'Maximum 2 hour session with 15 min idle timeout',
    priority: 5,
    rules: [
      { name: 'Session Timeout', attribute: 'Session-Timeout', operator: ':=', value: '7200', description: '2 hour maximum session', priority: 10 },
      { name: 'Idle Timeout', attribute: 'Idle-Timeout', operator: ':=', value: '900', description: '15 minute idle timeout', priority: 5 },
    ],
  },
  {
    name: 'Time Limit 8h',
    type: 'time',
    description: 'Maximum 8 hour session with 30 min idle timeout',
    priority: 5,
    rules: [
      { name: 'Session Timeout', attribute: 'Session-Timeout', operator: ':=', value: '28800', description: '8 hour maximum session', priority: 10 },
      { name: 'Idle Timeout', attribute: 'Idle-Timeout', operator: ':=', value: '1800', description: '30 minute idle timeout', priority: 5 },
    ],
  },
  {
    name: 'Data Cap 5GB',
    type: 'data',
    description: 'Monthly data usage cap of 5 GB',
    priority: 5,
    rules: [
      { name: 'Monthly Data Cap', attribute: 'ChilliSpot-Max-Total-Octets', operator: ':=', value: '5368709120', description: '5 GB monthly data limit', priority: 10 },
    ],
  },
  {
    name: 'Data Cap 50GB',
    type: 'data',
    description: 'Monthly data usage cap of 50 GB',
    priority: 5,
    rules: [
      { name: 'Monthly Data Cap', attribute: 'ChilliSpot-Max-Total-Octets', operator: ':=', value: '53687091200', description: '50 GB monthly data limit', priority: 10 },
    ],
  },
  {
    name: 'Hotspot Access',
    type: 'access',
    description: 'Standard hotspot access with time and bandwidth limits',
    priority: 3,
    rules: [
      { name: 'Session Timeout', attribute: 'Session-Timeout', operator: ':=', value: '3600', description: '1 hour max session', priority: 5 },
      { name: 'Idle Timeout', attribute: 'Idle-Timeout', operator: ':=', value: '300', description: '5 minute idle timeout', priority: 4 },
      { name: 'Download Limit', attribute: 'WISPr-Bandwidth-Max-Down', operator: ':=', value: '10485760', description: '10 Mbps download', priority: 3 },
      { name: 'Upload Limit', attribute: 'WISPr-Bandwidth-Max-Up', operator: ':=', value: '5242880', description: '5 Mbps upload', priority: 3 },
      { name: 'Simultaneous Use', attribute: 'Simultaneous-Use', operator: ':=', value: '1', description: 'One session at a time', priority: 10 },
    ],
  },
  {
    name: 'Corporate Access',
    type: 'access',
    description: 'Full corporate network access with no restrictions',
    priority: 10,
    rules: [
      { name: 'Session Timeout', attribute: 'Session-Timeout', operator: ':=', value: '86400', description: '24 hour max session', priority: 5 },
      { name: 'Idle Timeout', attribute: 'Idle-Timeout', operator: ':=', value: '3600', description: '1 hour idle timeout', priority: 4 },
      { name: 'Download Limit', attribute: 'WISPr-Bandwidth-Max-Down', operator: ':=', value: '104857600', description: '100 Mbps download', priority: 3 },
      { name: 'Upload Limit', attribute: 'WISPr-Bandwidth-Max-Up', operator: ':=', value: '52428800', description: '50 Mbps upload', priority: 3 },
      { name: 'Simultaneous Use', attribute: 'Simultaneous-Use', operator: ':=', value: '3', description: 'Up to 3 simultaneous sessions', priority: 10 },
    ],
  },
]

// ==================== Types ====================

interface PolicyRule {
  id?: string
  name: string
  attribute: string
  operator: string
  value: string
  description?: string
  priority: number
}

interface LinkedPlan {
  id: string
  name: string
  description: string | null
  planType: string
  status: string
  price: number
}

interface Policy {
  id: string
  name: string
  description: string | null
  type: string
  status: string
  priority: number
  createdAt: string
  updatedAt: string
  rules: PolicyRule[]
  planGroups: { plan: LinkedPlan }[]
  _count: { rules: number; planGroups: number }
}

interface PoliciesResponse {
  policies: Policy[]
  total: number
  page: number
  totalPages: number
  stats: {
    totalPolicies: number
    activePolicies: number
    totalRules: number
    bandwidthCount: number
    timeCount: number
    dataCount: number
    accessCount: number
    aclCount: number
    firewallCount: number
  }
}

interface RuleFormData {
  name: string
  attribute: string
  operator: string
  value: string
  description: string
  priority: number
}

// ==================== Component ====================

export function PoliciesView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; policy: Policy | null }>({ open: false, policy: null })
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  // Form state
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState('bandwidth')
  const [formPriority, setFormPriority] = useState(0)
  const [formStatus, setFormStatus] = useState('active')
  const [formRules, setFormRules] = useState<RuleFormData[]>([])

  const resetForm = () => {
    setEditingPolicy(null)
    setFormName('')
    setFormDescription('')
    setFormType('bandwidth')
    setFormPriority(0)
    setFormStatus('active')
    setFormRules([])
  }

  // Fetch policies
  const { data, isLoading, isFetching } = useQuery<PoliciesResponse>({
    queryKey: ['policies', page, search, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      })
      if (search) params.set('search', search)
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/policies?${params}`); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json()
    },
  })

  // Create policy mutation
  const createMutation = useMutation({
    mutationFn: async (body: { name: string; description: string; type: string; priority: number; status: string; rules: RuleFormData[] }) => {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json()
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Policy Created', description: `"${formName}" has been created successfully` })
        setDialogOpen(false)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['policies'] })
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create policy', variant: 'destructive' })
    },
  })

  // Update policy mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { name: string; description: string; type: string; priority: number; status: string; rules: RuleFormData[] } }) => {
      const res = await fetch(`/api/policies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json()
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Policy Updated', description: `"${formName}" has been updated successfully` })
        setDialogOpen(false)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['policies'] })
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update policy', variant: 'destructive' })
    },
  })

  // Delete policy mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json()
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Policy Deleted', description: data.message })
        setDeleteDialog({ open: false, policy: null })
        queryClient.invalidateQueries({ queryKey: ['policies'] })
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete policy', variant: 'destructive' })
    },
  })

  // Duplicate policy mutation
  const duplicateMutation = useMutation({
    mutationFn: async (policy: Policy) => {
      const newName = `${policy.name} (Copy)`
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: policy.description,
          type: policy.type,
          priority: policy.priority,
          status: policy.status,
          rules: policy.rules.map(r => ({
            name: r.name,
            attribute: r.attribute,
            operator: r.operator,
            value: r.value,
            description: r.description,
            priority: r.priority,
          })),
        }),
      }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json()
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Policy Duplicated', description: 'The policy has been duplicated successfully' })
        queryClient.invalidateQueries({ queryKey: ['policies'] })
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to duplicate policy', variant: 'destructive' })
    },
  })

  // Handlers
  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (policy: Policy) => {
    setEditingPolicy(policy)
    setFormName(policy.name)
    setFormDescription(policy.description || '')
    setFormType(policy.type)
    setFormPriority(policy.priority)
    setFormStatus(policy.status)
    setFormRules(policy.rules.map(r => ({
      name: r.name,
      attribute: r.attribute,
      operator: r.operator,
      value: r.value,
      description: r.description || '',
      priority: r.priority,
    })))
    setDialogOpen(true)
  }

  const applyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
    resetForm()
    setFormName(template.name)
    setFormDescription(template.description)
    setFormType(template.type)
    setFormPriority(template.priority)
    setFormStatus('active')
    setFormRules(template.rules.map(r => ({
      ...r,
      description: r.description || '',
    })))
    setTemplateDialogOpen(false)
    setDialogOpen(true)
  }

  const addRule = () => {
    setFormRules(prev => [...prev, {
      name: `Rule ${prev.length + 1}`,
      attribute: 'Session-Timeout',
      operator: ':=',
      value: '',
      description: '',
      priority: prev.length > 0 ? Math.max(...prev.map(r => r.priority)) + 1 : 1,
    }])
  }

  const removeRule = (index: number) => {
    setFormRules(prev => prev.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, field: keyof RuleFormData, value: string | number) => {
    setFormRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast({ title: 'Validation Error', description: 'Policy name is required', variant: 'destructive' })
      return
    }

    const body = {
      name: formName.trim(),
      description: formDescription.trim(),
      type: formType,
      priority: formPriority,
      status: formStatus,
      rules: formRules.filter(r => r.attribute && r.value),
    }

    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, body })
    } else {
      createMutation.mutate(body)
    }
  }

  const hasFilters = search || typeFilter !== 'all' || statusFilter !== 'all'

  const stats = data?.stats
  const getTypeInfo = (type: string) => POLICY_TYPES.find(t => t.value === type) || POLICY_TYPES[0]

  // Computed type distribution data
  const typeDistribution = useMemo(() => {
    if (!stats) return []
    return POLICY_TYPES.map(t => ({
      type: t.value,
      label: t.label,
      count: (stats as Record<string, number>)[`${t.value}Count`] || 0,
    })).filter(t => t.count > 0)
  }, [stats])

  const mostUsedType = typeDistribution.length > 0
    ? typeDistribution.reduce((best, t) => t.count > best.count ? t : best, typeDistribution[0])
    : null
  const maxTypeCount = typeDistribution.length > 0 ? Math.max(...typeDistribution.map(t => t.count)) : 1

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!data?.policies?.length} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Policies Export',
                  headers: ['Name', 'Type', 'Status', 'Priority', 'Rules Count', 'Linked Plans', 'Created At', 'Updated At'],
                  filename: `policies-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: (data?.policies || []).map((p) => [
                    p.name,
                    POLICY_TYPES.find(t => t.value === p.type)?.label || p.type,
                    p.status,
                    p.priority,
                    p._count.rules,
                    p._count.planGroups,
                    format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm'),
                    format(new Date(p.updatedAt), 'yyyy-MM-dd HH:mm'),
                  ]),
                }
                exportToCSV(opts)
                toast({ title: 'Exported', description: `${data?.policies.length || 0} policies exported as CSV` })
              }}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Policies Export',
                  headers: ['Name', 'Type', 'Status', 'Priority', 'Rules Count', 'Linked Plans', 'Created At', 'Updated At'],
                  filename: `policies-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: (data?.policies || []).map((p) => [
                    p.name,
                    POLICY_TYPES.find(t => t.value === p.type)?.label || p.type,
                    p.status,
                    p.priority,
                    p._count.rules,
                    p._count.planGroups,
                    format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm'),
                    format(new Date(p.updatedAt), 'yyyy-MM-dd HH:mm'),
                  ]),
                }
                exportToJSON(opts)
                toast({ title: 'Exported', description: `${data?.policies.length || 0} policies exported as JSON` })
              }}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Quick Policy Templates */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => applyTemplate(POLICY_TEMPLATES[0])} className="gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Bandwidth Limit</span>
                <span className="text-[10px] text-muted-foreground">1 Mbps download/upload cap</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyTemplate(POLICY_TEMPLATES[2])} className="gap-2">
              <Clock className="h-3.5 w-3.5 text-violet-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Time Limit</span>
                <span className="text-[10px] text-muted-foreground">2h max session, 15m idle</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyTemplate(POLICY_TEMPLATES[4])} className="gap-2">
              <Database className="h-3.5 w-3.5 text-teal-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Data Cap</span>
                <span className="text-[10px] text-muted-foreground">5 GB monthly data limit</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => applyTemplate(POLICY_TEMPLATES[6])} className="gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Access Control</span>
                <span className="text-[10px] text-muted-foreground">Hotspot access with limits</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              resetForm()
              setFormName('ACL Firewall Policy')
              setFormDescription('Firewall rules for network access control')
              setFormType('firewall')
              setFormPriority(8)
              setFormStatus('active')
              setFormRules([
                { name: 'Filter Id', attribute: 'Filter-Id', operator: ':=', value: 'firewall-block', description: 'Apply firewall filter', priority: 10 },
                { name: 'Framed Filter Id', attribute: 'Framed-Filter-Id', operator: ':=', value: 'acl-restrict', description: 'Restrict frame access', priority: 8 },
                { name: 'NAS Port Type', attribute: 'NAS-Port-Type', operator: ':=', value: 'Ethernet', description: 'Restrict to Ethernet', priority: 5 },
              ])
              setDialogOpen(true)
            }} className="gap-2">
              <Flame className="h-3.5 w-3.5 text-red-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">ACL Firewall</span>
                <span className="text-[10px] text-muted-foreground">Filter and firewall rules</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Templates
        </Button>
        <Button size="sm" onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Policy
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Policies</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.totalPolicies || 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Policies</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.activePolicies || 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Rules</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : (stats?.totalRules || 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Most Used Type</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-lg font-bold truncate max-w-[120px]">
                    {mostUsedType ? mostUsedType.label : '\u2014'}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy Type Distribution */}
      {!isLoading && typeDistribution.length > 0 && (
        <Card className="hover-lift">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">Policy Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {typeDistribution.map((td) => {
              const typeInfo = POLICY_TYPES.find(t => t.value === td.type)
              const Icon = typeInfo?.icon || Shield
              const pct = (td.count / maxTypeCount) * 100
              const barColors: Record<string, string> = {
                bandwidth: 'bg-amber-500',
                time: 'bg-violet-500',
                data: 'bg-teal-500',
                access: 'bg-emerald-500',
                acl: 'bg-orange-500',
                firewall: 'bg-red-500',
              }
              return (
                <div key={td.type} className="flex items-center gap-3">
                  <div className={cn('flex items-center justify-center w-6 h-6 rounded shrink-0', typeInfo?.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs w-20 shrink-0 truncate">{td.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', barColors[td.type] || 'bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-6 text-right">{td.count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
      {isLoading && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setPage(1) }} className="text-xs gap-1 h-7">
                  <X className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-8 h-9"
                />
              </div>

              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Policy Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {POLICY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Rules</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Linked Plans</TableHead>
                  <TableHead className="text-xs">Updated</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Shield className="h-8 w-8 opacity-30" />
                        <p>No policies found</p>
                        {hasFilters && (
                          <Button variant="link" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all') }}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.policies.map((policy) => {
                    const typeInfo = getTypeInfo(policy.type)
                    const TypeIcon = typeInfo.icon

                    return (
                      <TableRow key={policy.id} className="group">
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{policy.name}</p>
                            {policy.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                {policy.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs gap-1 ${typeInfo.color} border-0`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {policy.status === 'active' ? (
                            <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">
                            {policy._count.rules}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{policy.priority}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{policy._count.planGroups}</span>
                          {policy.planGroups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {policy.planGroups.slice(0, 3).map(pg => (
                                <Badge key={pg.plan.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {pg.plan.name}
                                </Badge>
                              ))}
                              {policy.planGroups.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{policy.planGroups.length - 3}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(policy.updatedAt), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              title="Copy policy config"
                              onClick={() => {
                                const config = JSON.stringify(
                                  {
                                    name: policy.name,
                                    description: policy.description,
                                    type: policy.type,
                                    priority: policy.priority,
                                    status: policy.status,
                                    rules: policy.rules.map((r) => ({
                                      attribute: r.attribute,
                                      operator: r.operator,
                                      value: r.value,
                                    })),
                                  },
                                  null,
                                  2,
                                )
                                navigator.clipboard.writeText(config)
                                toast({ title: 'Copied', description: 'Policy config copied to clipboard' })
                              }}
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(policy)} className="gap-2">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { openEditDialog(policy) }} className="gap-2">
                                <Settings2 className="h-3.5 w-3.5" />
                                Manage Rules
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateMutation.mutate(policy)} className="gap-2">
                                <Copy className="h-3.5 w-3.5" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteDialog({ open: true, policy })}
                                className="gap-2 text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, data.total)} of {data.total} policies
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <span className="text-sm font-medium px-2">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="h-8 gap-1"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Policy Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
            <DialogDescription>
              {editingPolicy ? 'Update policy settings and rules' : 'Configure a new authorization policy with rules'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="rules">
                Rules
                {formRules.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5">
                    {formRules.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4 space-y-4 overflow-y-auto max-h-[45vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="policy-name">Name *</Label>
                  <Input
                    id="policy-name"
                    placeholder="e.g., Enterprise Bandwidth Policy"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="policy-desc">Description</Label>
                  <Textarea
                    id="policy-desc"
                    placeholder="Brief description of what this policy does..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Policy Type *</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POLICY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="policy-priority">Priority</Label>
                    <Input
                      id="policy-priority"
                      type="number"
                      value={formPriority}
                      onChange={(e) => setFormPriority(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formStatus} onValueChange={setFormStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rules" className="mt-4 flex flex-col overflow-hidden max-h-[45vh]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">
                  Policy Rules ({formRules.length})
                </div>
                <Button variant="outline" size="sm" onClick={addRule} className="gap-1 h-7">
                  <Plus className="h-3 w-3" />
                  Add Rule
                </Button>
              </div>

              {formRules.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border rounded-lg border-dashed">
                  <div className="text-center space-y-2 py-8">
                    <Settings2 className="h-8 w-8 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No rules configured</p>
                    <p className="text-xs text-muted-foreground">Click &quot;Add Rule&quot; to define authorization rules</p>
                    <Button variant="outline" size="sm" onClick={addRule} className="gap-1">
                      <Plus className="h-3 w-3" />
                      Add First Rule
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-4">
                    {formRules.map((rule, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                            <div className="sm:col-span-1 space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Name</Label>
                              <Input
                                placeholder="Rule name"
                                value={rule.name}
                                onChange={(e) => updateRule(index, 'name', e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-1 space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Attribute</Label>
                              <Select
                                value={rule.attribute}
                                onValueChange={(v) => updateRule(index, 'attribute', v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Attr" />
                                </SelectTrigger>
                                <SelectContent>
                                  {RADIUS_ATTRIBUTES.map(attr => (
                                    <SelectItem key={attr} value={attr} className="text-xs">
                                      {attr}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="sm:col-span-1 space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Operator</Label>
                              <Select
                                value={rule.operator}
                                onValueChange={(v) => updateRule(index, 'operator', v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OPERATORS.map(op => (
                                    <SelectItem key={op} value={op} className="text-xs font-mono">
                                      {op}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="sm:col-span-1 space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Value</Label>
                              <Input
                                placeholder="Value"
                                value={rule.value}
                                onChange={(e) => updateRule(index, 'value', e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="sm:col-span-1 space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Priority</Label>
                              <Input
                                type="number"
                                value={rule.priority}
                                onChange={(e) => updateRule(index, 'priority', Number(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="sm:col-span-1 flex items-end gap-1">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase">Description</Label>
                                <Input
                                  placeholder="Desc"
                                  value={rule.description}
                                  onChange={(e) => updateRule(index, 'description', e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={() => removeRule(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {editingPolicy ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Policy Templates
            </DialogTitle>
            <DialogDescription>
              Quick-create a policy from predefined templates. Rules will be pre-configured.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {POLICY_TEMPLATES.map((template, index) => {
                const typeInfo = getTypeInfo(template.type)
                const TypeIcon = typeInfo.icon

                return (
                  <Card
                    key={index}
                    className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <CardDescription className="text-[10px]">
                            {template.rules.length} rule{template.rules.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, policy: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Policy
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteDialog.policy?.name}&quot;</strong>?
              {deleteDialog.policy && deleteDialog.policy._count.planGroups > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  This policy is linked to {deleteDialog.policy._count.planGroups} plan(s). The associations will be removed.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.policy) {
                  deleteMutation.mutate(deleteDialog.policy.id)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
