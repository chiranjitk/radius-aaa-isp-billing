'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  MoreHorizontal,
  Power,
  Shield,
  Activity,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  List,
  LayoutGrid,
  Clock,
  Globe,
  Phone,
  Building2,
  MapPin,
  Key,
  Copy,
  CheckCircle2,
  XCircle,
  PauseCircle,
  UserCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ==========================================
// Types
// ==========================================

interface RadGroup {
  id: string
  name: string
  description?: string
  priority: number
}

interface RadUserGroup {
  id: string
  username: string
  groupName: string
  priority: number
  group?: RadGroup
}

interface RadAttr {
  id: string
  username: string
  attribute: string
  op: string
  value: string
}

interface RadSession {
  id: string
  sessionId: string
  nasIpAddress?: string
  framedIpAddress?: string
  acctStartTime: string
  acctStopTime?: string
  acctSessionTime?: number
  acctInputOctets?: number
  acctOutputOctets?: number
  status: string
  terminateCause?: string
  calledStationId?: string
  callingStationId?: string
}

interface Subscription {
  id: string
  status: string
  startDate: string
  expiryDate?: string
  nextBilling?: string
  autoRenew: boolean
  plan: {
    id: string
    name: string
    planType: string
    billingCycle: string
    price: number
    currency: string
  } | null
}

interface UserListItem {
  id: string
  username: string
  password: string
  fullName?: string
  email?: string
  phone?: string
  company?: string
  status: string
  authType: string
  simultaneous: number
  expiryDate?: string
  createdAt: string
  groups: RadUserGroup[]
  _count: {
    checkAttrs: number
    replyAttrs: number
    sessions: number
    subscriptions: number
  }
}

interface UserDetail extends UserListItem {
  address?: string
  checkAttrs: RadAttr[]
  replyAttrs: RadAttr[]
  sessions: RadSession[]
  subscriptions: Subscription[]
}

interface AttrRow {
  id: string
  attribute: string
  op: string
  value: string
}

interface UsersResponse {
  users: UserListItem[]
  total: number
  page: number
  totalPages: number
}

// ==========================================
// Constants
// ==========================================

const RADIUS_OPERATORS = [
  { value: '=', label: '=' },
  { value: ':=', label: ':=' },
  { value: '==', label: '==' },
  { value: '+=', label: '+=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: '=~', label: '=~' },
  { value: '!~', label: '!~' },
  { value: '=*', label: '=*' },
  { value: '!*', label: '!*' },
]

const AUTH_TYPES = ['PAP', 'CHAP', 'MS-CHAPv2', 'EAP']

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  disabled: { label: 'Disabled', variant: 'destructive', icon: XCircle },
  suspended: { label: 'Suspended', variant: 'secondary', icon: PauseCircle },
}

// ==========================================
// Helper functions
// ==========================================

function formatBytes(bytes: number | undefined | null): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function createEmptyAttrRow(): AttrRow {
  return { id: generateId(), attribute: '', op: ':=', value: '' }
}

// ==========================================
// Status Badge Component
// ==========================================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active
  const Icon = config.icon

  const colorClasses: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    disabled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800',
    suspended: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  }

  return (
    <Badge variant="outline" className={`gap-1.5 text-xs font-medium ${colorClasses[status] || ''}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ==========================================
// Attribute Row Component
// ==========================================

function AttributeRow({
  attr,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  attr: AttrRow
  index: number
  onChange: (id: string, field: keyof AttrRow, value: string) => void
  onRemove: (id: string) => void
  canRemove: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-center text-xs text-muted-foreground shrink-0">{index + 1}</span>
      <Input
        placeholder="Attribute"
        value={attr.attribute}
        onChange={(e) => onChange(attr.id, 'attribute', e.target.value)}
        className="h-8 text-sm flex-1 min-w-0"
      />
      <Select
        value={attr.op}
        onValueChange={(v) => onChange(attr.id, 'op', v)}
      >
        <SelectTrigger className="h-8 text-sm w-20 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RADIUS_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Value"
        value={attr.value}
        onChange={(e) => onChange(attr.id, 'value', e.target.value)}
        className="h-8 text-sm flex-1 min-w-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(attr.id)}
        disabled={!canRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ==========================================
// User Form Dialog
// ==========================================

function UserFormDialog({
  open,
  onOpenChange,
  editUser,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editUser: UserDetail | null
}) {
  const queryClient = useQueryClient()
  const isEdit = !!editUser

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    authType: 'PAP',
    simultaneous: 1,
    status: 'active',
  })

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [checkAttrs, setCheckAttrs] = useState<AttrRow[]>([])
  const [replyAttrs, setReplyAttrs] = useState<AttrRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch groups for multi-select
  const { data: groupsData } = useQuery<{ groups: RadGroup[] }>({
    queryKey: ['groups-list'],
    queryFn: () => fetch('/api/groups').then((r) => r.json()),
  })

  const groups = groupsData?.groups || []

  // Populate form when editing
  const populateForm = useCallback((user: UserDetail) => {
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      company: user.company || '',
      address: user.address || '',
      authType: user.authType,
      simultaneous: user.simultaneous,
      status: user.status,
    })
    setSelectedGroupIds(user.groups?.map((g) => g.group?.id).filter(Boolean) as string[] || [])
    setCheckAttrs(
      user.checkAttrs?.map((a) => ({
        id: a.id || generateId(),
        attribute: a.attribute,
        op: a.op,
        value: a.value,
      })) || []
    )
    setReplyAttrs(
      user.replyAttrs?.map((a) => ({
        id: a.id || generateId(),
        attribute: a.attribute,
        op: a.op,
        value: a.value,
      })) || []
    )
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      authType: 'PAP',
      simultaneous: 1,
      status: 'active',
    })
    setSelectedGroupIds([])
    setCheckAttrs([])
    setReplyAttrs([])
  }, [])

  // Handle open change
  const handleOpenChange = (val: boolean) => {
    if (val && editUser) {
      populateForm(editUser)
    } else if (val && !editUser) {
      resetForm()
    }
    onOpenChange(val)
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create user')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('User created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/users/${editUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update user')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-detail', editUser?.id] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.username.trim()) {
      toast.error('Username is required')
      return
    }
    if (!isEdit && !formData.password.trim()) {
      toast.error('Password is required')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        address: formData.address.trim() || undefined,
        authType: formData.authType,
        simultaneous: Number(formData.simultaneous) || 1,
        status: formData.status,
        groupIds: selectedGroupIds,
      }

      if (!isEdit) {
        payload.password = formData.password
      } else if (formData.password) {
        payload.password = formData.password
      }

      // Include attributes only if they have valid entries
      const validCheckAttrs = checkAttrs.filter((a) => a.attribute.trim() && a.value.trim())
      const validReplyAttrs = replyAttrs.filter((a) => a.attribute.trim() && a.value.trim())

      if (validCheckAttrs.length > 0) {
        payload.checkAttrs = validCheckAttrs.map((a) => ({
          attribute: a.attribute.trim(),
          op: a.op,
          value: a.value.trim(),
        }))
      }
      if (validReplyAttrs.length > 0) {
        payload.replyAttrs = validReplyAttrs.map((a) => ({
          attribute: a.attribute.trim(),
          op: a.op,
          value: a.value.trim(),
        }))
      }

      if (isEdit) {
        await updateMutation.mutateAsync(payload)
      } else {
        await createMutation.mutateAsync(payload)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAttrChange = (
    list: AttrRow[],
    setList: (v: AttrRow[]) => void,
    id: string,
    field: keyof AttrRow,
    value: string
  ) => {
    setList(list.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            {isEdit ? 'Edit User' : 'Add New User'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  placeholder="e.g. john.doe"
                  value={formData.username}
                  onChange={(e) => setFormData((d) => ({ ...d, username: e.target.value }))}
                  disabled={isEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {!isEdit && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                  value={formData.password}
                  onChange={(e) => setFormData((d) => ({ ...d, password: e.target.value }))}
                  required={!isEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData((d) => ({ ...d, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => setFormData((d) => ({ ...d, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={formData.company}
                  onChange={(e) => setFormData((d) => ({ ...d, company: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, Country"
                value={formData.address}
                onChange={(e) => setFormData((d) => ({ ...d, address: e.target.value }))}
              />
            </div>
          </div>

          <Separator />

          {/* RADIUS Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              RADIUS Settings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Auth Type</Label>
                <Select
                  value={formData.authType}
                  onValueChange={(v) => setFormData((d) => ({ ...d, authType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Simultaneous</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.simultaneous}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, simultaneous: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((d) => ({ ...d, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Group Assignment */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Group Assignment
            </h4>
            <div className="flex flex-wrap gap-2">
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground">No groups available. Create groups first.</p>
              )}
              {groups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id)
                return (
                  <Button
                    key={group.id}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleGroup(group.id)}
                    className="gap-1.5"
                  >
                    <Shield className="h-3 w-3" />
                    {group.name}
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                  </Button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Check Attributes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Check Attributes
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCheckAttrs((prev) => [...prev, createEmptyAttrRow()])}
                className="gap-1.5"
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {checkAttrs.map((attr, i) => (
                <AttributeRow
                  key={attr.id}
                  attr={attr}
                  index={i}
                  onChange={(id, field, value) =>
                    handleAttrChange(checkAttrs, setCheckAttrs, id, field, value)
                  }
                  onRemove={(id) => setCheckAttrs((prev) => prev.filter((a) => a.id !== id))}
                  canRemove={checkAttrs.length > 0}
                />
              ))}
              {checkAttrs.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  Default Cleartext-Password will be created automatically.
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Reply Attributes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Reply Attributes
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReplyAttrs((prev) => [...prev, createEmptyAttrRow()])}
                className="gap-1.5"
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {replyAttrs.map((attr, i) => (
                <AttributeRow
                  key={attr.id}
                  attr={attr}
                  index={i}
                  onChange={(id, field, value) =>
                    handleAttrChange(replyAttrs, setReplyAttrs, id, field, value)
                  }
                  onRemove={(id) => setReplyAttrs((prev) => prev.filter((a) => a.id !== id))}
                  canRemove={replyAttrs.length > 0}
                />
              ))}
              {replyAttrs.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No reply attributes configured.
                </p>
              )}
            </div>
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// User Details Sheet
// ==========================================

function UserDetailsSheet({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
}) {
  const { data: user, isLoading } = useQuery<UserDetail>({
    queryKey: ['user-detail', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((r) => r.json()),
    enabled: !!userId && open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Separator />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : user ? (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <SheetTitle className="text-lg">{user.fullName || user.username}</SheetTitle>
                  <SheetDescription className="text-xs">
                    @{user.username} &middot; {user.authType}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-3">
                <StatusBadge status={user.status} />
              </div>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-12rem)]">
              <Tabs defaultValue="overview" className="w-full">
                <div className="px-6 pt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="overview" className="flex-1 gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="attributes" className="flex-1 gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      Attributes
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="flex-1 gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      Sessions
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="flex-1 gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      Billing
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem icon={UserCircle} label="Username" value={user.username} />
                    <InfoItem icon={Key} label="Auth Type" value={user.authType} />
                    <InfoItem icon={Mail} label="Email" value={user.email || '—'} />
                    <InfoItem icon={Phone} label="Phone" value={user.phone || '—'} />
                    <InfoItem icon={Building2} label="Company" value={user.company || '—'} />
                    <InfoItem icon={MapPin} label="Address" value={user.address || '—'} />
                    <InfoItem icon={Globe} label="Simultaneous" value={`${user.simultaneous}`} />
                    <InfoItem
                      icon={Clock}
                      label="Created"
                      value={format(new Date(user.createdAt), 'MMM dd, yyyy')}
                    />
                  </div>

                  {user.expiryDate && (
                    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                      <CardContent className="p-3">
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                          Expires: {format(new Date(user.expiryDate), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Separator />
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Groups</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {user.groups?.length > 0 ? (
                        user.groups.map((g) => (
                          <Badge key={g.id} variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {g.group?.name || g.groupName}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No groups assigned</p>
                      )}
                    </div>
                  </div>

                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Check Attrs" value={user.checkAttrs?.length || 0} />
                    <MiniStat label="Reply Attrs" value={user.replyAttrs?.length || 0} />
                    <MiniStat label="Sessions" value={user._count?.sessions || 0} />
                    <MiniStat label="Subscriptions" value={user._count?.subscriptions || 0} />
                  </div>
                </TabsContent>

                {/* Attributes Tab */}
                <TabsContent value="attributes" className="px-6 py-4 space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Check Attributes</h5>
                    {user.checkAttrs?.length > 0 ? (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8 text-xs">Attribute</TableHead>
                              <TableHead className="h-8 text-xs w-16">Op</TableHead>
                              <TableHead className="h-8 text-xs">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {user.checkAttrs.map((attr) => (
                              <TableRow key={attr.id}>
                                <TableCell className="py-2 text-xs font-mono">{attr.attribute}</TableCell>
                                <TableCell className="py-2 text-xs font-mono text-muted-foreground">
                                  {attr.op}
                                </TableCell>
                                <TableCell className="py-2 text-xs font-mono">{attr.value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No check attributes</p>
                    )}
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold mb-2">Reply Attributes</h5>
                    {user.replyAttrs?.length > 0 ? (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8 text-xs">Attribute</TableHead>
                              <TableHead className="h-8 text-xs w-16">Op</TableHead>
                              <TableHead className="h-8 text-xs">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {user.replyAttrs.map((attr) => (
                              <TableRow key={attr.id}>
                                <TableCell className="py-2 text-xs font-mono">{attr.attribute}</TableCell>
                                <TableCell className="py-2 text-xs font-mono text-muted-foreground">
                                  {attr.op}
                                </TableCell>
                                <TableCell className="py-2 text-xs font-mono">{attr.value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No reply attributes</p>
                    )}
                  </div>
                </TabsContent>

                {/* Sessions Tab */}
                <TabsContent value="sessions" className="px-6 py-4">
                  {user.sessions?.length > 0 ? (
                    <div className="space-y-3">
                      {user.sessions.map((session) => (
                        <Card key={session.id} className="p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono text-muted-foreground">
                              {session.sessionId.substring(0, 16)}...
                            </span>
                            <Badge
                              variant={session.status === 'active' ? 'default' : 'secondary'}
                              className="text-[10px] h-5"
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            <div>
                              <span className="text-muted-foreground">NAS: </span>
                              <span className="font-mono">{session.nasIpAddress || '—'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">IP: </span>
                              <span className="font-mono">{session.framedIpAddress || '—'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Start: </span>
                              {format(new Date(session.acctStartTime), 'MMM dd HH:mm:ss')}
                            </div>
                            {session.acctStopTime && (
                              <div>
                                <span className="text-muted-foreground">Stop: </span>
                                {format(new Date(session.acctStopTime), 'MMM dd HH:mm:ss')}
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              {formatDuration(session.acctSessionTime)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Data: </span>
                              {formatBytes(session.acctInputOctets)} ↓ / {formatBytes(session.acctOutputOctets)} ↑
                            </div>
                          </div>
                          {session.terminateCause && (
                            <div className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                              Cause: {session.terminateCause}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No sessions recorded</p>
                    </div>
                  )}
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="px-6 py-4">
                  {user.subscriptions?.length > 0 ? (
                    <div className="space-y-3">
                      {user.subscriptions.map((sub) => (
                        <Card key={sub.id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{sub.plan?.name || 'Unknown Plan'}</span>
                            <Badge
                              variant={
                                sub.status === 'active'
                                  ? 'default'
                                  : sub.status === 'expired'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className="text-[10px] h-5"
                            >
                              {sub.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            <div>
                              <span className="text-muted-foreground">Type: </span>
                              {sub.plan?.planType || '—'}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cycle: </span>
                              {sub.plan?.billingCycle || '—'}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Price: </span>
                              ${sub.plan?.price || 0} {sub.plan?.currency || 'USD'}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Auto-Renew: </span>
                              {sub.autoRenew ? 'Yes' : 'No'}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Start: </span>
                              {format(new Date(sub.startDate), 'MMM dd, yyyy')}
                            </div>
                            {sub.expiryDate && (
                              <div>
                                <span className="text-muted-foreground">Expiry: </span>
                                {format(new Date(sub.expiryDate), 'MMM dd, yyyy')}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No subscriptions</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            User not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ==========================================
// Small Helper Components
// ==========================================

function Mail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-sm font-medium truncate" title={value}>
        {value}
      </p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  )
}

// ==========================================
// Main Users View Component
// ==========================================

export default function UsersView() {
  const queryClient = useQueryClient()

  // Filters & pagination
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  // Dialog & sheet state
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserDetail | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null)

  // Fetch users
  const {
    data: usersData,
    isLoading,
    isError,
    refetch,
  } = useQuery<UsersResponse>({
    queryKey: ['users', search, statusFilter, groupFilter, page, limit],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (groupFilter !== 'all') params.set('group', groupFilter)
      params.set('page', String(page))
      params.set('limit', String(limit))
      return fetch(`/api/users?${params.toString()}`).then((r) => r.json())
    },
  })

  // Fetch groups for filter dropdown
  const { data: groupsData } = useQuery<{ groups: RadGroup[] }>({
    queryKey: ['groups-filter'],
    queryFn: () => fetch('/api/groups').then((r) => r.json()),
  })

  const groups = groupsData?.groups || []
  const users = usersData?.users || []
  const totalPages = usersData?.totalPages || 0
  const total = usersData?.total || 0

  // Search debounce
  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Status change mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active'
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User status updated')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => {
      toast.error('Failed to update status')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete user')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error('Failed to delete user')
    },
  })

  // Handlers
  const handleAddUser = () => {
    setEditUser(null)
    setFormDialogOpen(true)
  }

  const handleEditUser = (user: UserListItem) => {
    // Fetch full user details for editing
    fetch(`/api/users/${user.id}`)
      .then((r) => r.json())
      .then((data: UserDetail) => {
        setEditUser(data)
        setFormDialogOpen(true)
      })
      .catch(() => {
        toast.error('Failed to load user details')
      })
  }

  const handleViewUser = (userId: string) => {
    setDetailUserId(userId)
    setDetailSheetOpen(true)
  }

  const handleDeleteClick = (user: UserListItem) => {
    setDeleteTarget(user)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id)
    }
  }

  const handleToggleStatus = (user: UserListItem) => {
    toggleStatusMutation.mutate({ userId: user.id, currentStatus: user.status })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6" />
              RADIUS Users
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage RADIUS user accounts, authentication settings, and group assignments.
            </p>
          </div>
          <Button onClick={handleAddUser} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9 h-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9 w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              {/* Group Filter */}
              <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9 w-full sm:w-40">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="p-12 text-center">
                <XCircle className="h-10 w-10 mx-auto text-destructive/50 mb-3" />
                <h3 className="font-semibold mb-1">Failed to load users</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  An error occurred while fetching users.
                </p>
                <Button variant="outline" onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold mb-1">No users found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {search || statusFilter !== 'all' || groupFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by adding your first RADIUS user.'}
                </p>
                {!search && statusFilter === 'all' && groupFilter === 'all' && (
                  <Button onClick={handleAddUser} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-10 pl-4">Username</TableHead>
                        <TableHead className="h-10">Full Name</TableHead>
                        <TableHead className="h-10">Email</TableHead>
                        <TableHead className="h-10">Groups</TableHead>
                        <TableHead className="h-10">Status</TableHead>
                        <TableHead className="h-10">Auth Type</TableHead>
                        <TableHead className="h-10 text-center">Sim.</TableHead>
                        <TableHead className="h-10 text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="group">
                          <TableCell className="py-3 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <UserCircle className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.username}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {user._count.checkAttrs} check · {user._count.replyAttrs} reply
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-sm">
                            {user.fullName || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="py-3 text-sm">
                            {user.email || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {user.groups.length > 0 ? (
                                user.groups.slice(0, 2).map((g) => (
                                  <Badge key={g.id} variant="secondary" className="text-[10px] h-5 font-normal">
                                    {g.group?.name || g.groupName}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              {user.groups.length > 2 && (
                                <Badge variant="outline" className="text-[10px] h-5 font-normal">
                                  +{user.groups.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <StatusBadge status={user.status} />
                          </TableCell>
                          <TableCell className="py-3 text-sm font-mono text-xs">
                            {user.authType}
                          </TableCell>
                          <TableCell className="py-3 text-center text-sm">
                            {user.simultaneous}
                          </TableCell>
                          <TableCell className="py-3 text-right pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleViewUser(user.id)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditUser(user)}
                                  className="gap-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(user)}
                                  className="gap-2"
                                >
                                  <Power className="h-4 w-4" />
                                  {user.status === 'active' ? 'Disable' : 'Enable'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(user)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        const pageNum =
                          totalPages <= 5
                            ? i + 1
                            : page <= 3
                              ? i + 1
                              : page >= totalPages - 2
                                ? totalPages - 4 + i
                                : page - 2 + i
                        if (pageNum < 1 || pageNum > totalPages) return null
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? 'default' : 'outline'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit User Dialog */}
        <UserFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          editUser={editUser}
        />

        {/* User Details Sheet */}
        <UserDetailsSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          userId={detailUserId}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete User
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{' '}
                <strong className="text-foreground">{deleteTarget?.username}</strong>? This action
                will permanently remove the user and all associated data including check/reply
                attributes, sessions, and group assignments. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
