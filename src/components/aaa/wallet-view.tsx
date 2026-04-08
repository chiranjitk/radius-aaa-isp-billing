'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  CreditCard,
  Settings,
  History,
  User,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  ArrowUpDown,
  DollarSign,
  Clock,
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Types ───────────────────────────────────────────────────────────
interface WalletItem {
  id: string
  username: string
  balance: number
  creditLimit: number
  totalTopup: number
  totalSpent: number
  status: string
  lowBalanceAlert: number
  autoTopup: boolean
  autoTopupAmount: number
  createdAt: string
  updatedAt: string
}

interface WalletTransaction {
  id: string
  walletId: string
  username: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  referenceId: string | null
  method: string | null
  performedBy: string | null
  createdAt: string
}

interface WalletsResponse {
  wallets: WalletItem[]
  stats: {
    totalWallets: number
    activeWallets: number
    totalBalance: number
    totalTopup: number
    totalSpent: number
  }
}

interface TransactionsResponse {
  transactions: WalletTransaction[]
  wallet: WalletItem
  total: number
}

// ─── Status config ──────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Active' },
  frozen: { variant: 'secondary', label: 'Frozen' },
  closed: { variant: 'destructive', label: 'Closed' },
}

const TX_TYPE_CONFIG: Record<string, { color: string; icon: typeof ArrowUpCircle; label: string }> = {
  topup: { color: 'text-emerald-600 dark:text-emerald-400', icon: ArrowUpCircle, label: 'Top-up' },
  deduction: { color: 'text-rose-600 dark:text-rose-400', icon: ArrowDownCircle, label: 'Deduction' },
  refund: { color: 'text-emerald-600 dark:text-emerald-400', icon: ArrowUpCircle, label: 'Refund' },
  adjustment: { color: 'text-amber-600 dark:text-amber-400', icon: ArrowUpDown, label: 'Adjustment' },
  plan_renewal: { color: 'text-rose-600 dark:text-rose-400', icon: ArrowDownCircle, label: 'Plan Renewal' },
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  return `$${amount.toFixed(2)}`
}

// ─── Component ───────────────────────────────────────────────────────
export function WalletView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('wallets')

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [topupDialogOpen, setTopupDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ username: string } | null>(null)

  // Selected wallet for transactions
  const [selectedWallet, setSelectedWallet] = useState<WalletItem | null>(null)
  const [txTypeFilter, setTxTypeFilter] = useState('all')

  // Form state
  const [createForm, setCreateForm] = useState({
    username: '',
    creditLimit: '0',
    lowBalanceAlert: '10',
    autoTopup: false,
    autoTopupAmount: '0',
  })
  const [topupForm, setTopupForm] = useState({ amount: '', method: 'cash', description: '' })
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '' })

  // ─── Queries ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<WalletsResponse>({
    queryKey: ['wallets', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/wallets?${params}`)
      if (!res.ok) throw new Error('Failed to fetch wallets')
      return res.json()
    },
  })

  const { data: txData, isLoading: txLoading } = useQuery<TransactionsResponse>({
    queryKey: ['wallet-transactions', selectedWallet?.username, txTypeFilter],
    queryFn: async () => {
      if (!selectedWallet) return null
      const params = new URLSearchParams()
      if (txTypeFilter !== 'all') params.set('type', txTypeFilter)
      params.set('limit', '50')
      const res = await fetch(`/api/wallets/${selectedWallet.username}/transactions?${params}`)
      if (!res.ok) throw new Error('Failed to fetch transactions')
      return res.json()
    },
    enabled: !!selectedWallet,
  })

  // ─── Mutations ──────────────────────────────────────────────────
  const createWalletMutation = useMutation({
    mutationFn: async (formData: Record<string, unknown>) => {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create wallet') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      toast.success('Wallet created successfully')
      setCreateDialogOpen(false)
      resetCreateForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const topupMutation = useMutation({
    mutationFn: async ({ username, formData }: { username: string; formData: Record<string, unknown> }) => {
      const res = await fetch(`/api/wallets/${username}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to topup') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
      toast.success('Wallet topped up successfully')
      setTopupDialogOpen(false)
      resetTopupForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const adjustMutation = useMutation({
    mutationFn: async ({ username, formData }: { username: string; formData: Record<string, unknown> }) => {
      const res = await fetch(`/api/wallets/${username}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, method: 'admin_adjustment' }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to adjust balance') }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] })
      toast.success('Balance adjusted successfully')
      setAdjustDialogOpen(false)
      resetAdjustForm()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async (wallet: WalletItem) => {
      const newStatus = wallet.status === 'active' ? 'frozen' : 'active'
      const res = await fetch(`/api/wallets/${wallet.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      toast.success('Wallet status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── Helpers ─────────────────────────────────────────────────────
  function resetCreateForm() {
    setCreateForm({ username: '', creditLimit: '0', lowBalanceAlert: '10', autoTopup: false, autoTopupAmount: '0' })
  }

  function resetTopupForm() {
    setTopupForm({ amount: '', method: 'cash', description: '' })
  }

  function resetAdjustForm() {
    setAdjustForm({ amount: '', reason: '' })
  }

  function submitCreate() {
    if (!createForm.username.trim()) { toast.error('Username is required'); return }
    createWalletMutation.mutate(createForm)
  }

  function openTopup(wallet: WalletItem) {
    setSelectedWallet(wallet)
    resetTopupForm()
    setTopupDialogOpen(true)
  }

  function openAdjust(wallet: WalletItem) {
    setSelectedWallet(wallet)
    resetAdjustForm()
    setAdjustDialogOpen(true)
  }

  function submitTopup() {
    if (!topupForm.amount || parseFloat(topupForm.amount) <= 0) { toast.error('Valid positive amount required'); return }
    if (!selectedWallet) return
    topupMutation.mutate({
      username: selectedWallet.username,
      formData: {
        amount: parseFloat(topupForm.amount),
        method: topupForm.method,
        description: topupForm.description || `Topup via ${topupForm.method}`,
      },
    })
  }

  function submitAdjust() {
    if (!adjustForm.amount || parseFloat(adjustForm.amount) === 0) { toast.error('Non-zero amount required'); return }
    if (!selectedWallet) return
    adjustMutation.mutate({
      username: selectedWallet.username,
      formData: {
        amount: parseFloat(adjustForm.amount),
        reason: adjustForm.reason || 'Manual balance adjustment',
        performedBy: 'admin',
      },
    })
  }

  function openTransactions(wallet: WalletItem) {
    setSelectedWallet(wallet)
    setTxTypeFilter('all')
    setActiveTab('transactions')
  }

  function confirmDelete(username: string) {
    setDeleteTarget({ username })
    setDeleteDialogOpen(true)
  }

  const stats = data?.stats
  const wallets = data?.wallets || []

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-transition">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Wallets</p>
                {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold stat-number">{stats?.totalWallets ?? 0}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Balance</p>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold stat-number text-emerald-600">{formatCurrency(stats?.totalBalance ?? 0)}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Top-ups</p>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold stat-number">{formatCurrency(stats?.totalTopup ?? 0)}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Spent</p>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold stat-number text-rose-600">{formatCurrency(stats?.totalSpent ?? 0)}</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="wallets" className="gap-2">
              <Wallet className="h-3.5 w-3.5" />
              Wallets
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2" disabled={!selectedWallet}>
              <History className="h-3.5 w-3.5" />
              {selectedWallet ? `${selectedWallet.username} Transactions` : 'Transactions'}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Wallet
            </Button>
          </div>
        </div>

        {/* ─── Wallets Tab ──────────────────────────────────────── */}
        <TabsContent value="wallets" className="space-y-4">
          {/* Filter Bar */}
          <Card className="card-hover">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by username..."
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
                    <SelectItem value="frozen">Frozen</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Wallets Table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Total Top-up</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Auto Top-up</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : wallets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>No wallets found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      wallets.map((w) => (
                        <TableRow key={w.id} className="group">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-primary" />
                              </div>
                              {w.username}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "font-mono font-semibold",
                              w.balance < w.lowBalanceAlert ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                              {formatCurrency(w.balance)}
                            </span>
                            {w.balance < w.lowBalanceAlert && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">Low balance</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{formatCurrency(w.creditLimit)}</TableCell>
                          <TableCell className="font-mono text-sm">{formatCurrency(w.totalTopup)}</TableCell>
                          <TableCell className="font-mono text-sm">{formatCurrency(w.totalSpent)}</TableCell>
                          <TableCell>
                            {w.autoTopup ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
                                {formatCurrency(w.autoTopupAmount)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Off</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_BADGE[w.status]?.variant || 'outline'}>
                              {STATUS_BADGE[w.status]?.label || w.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTransactions(w)} title="Transactions">
                                <History className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => openTopup(w)} title="Top-up">
                                <ArrowUpCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => openAdjust(w)} title="Adjust">
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleStatusMutation.mutate(w)}
                                title={w.status === 'active' ? 'Freeze' : 'Activate'}
                              >
                                {w.status === 'active' ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => confirmDelete(w.username)}
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

        {/* ─── Transactions Tab ───────────────────────────────────── */}
        <TabsContent value="transactions" className="space-y-4">
          {selectedWallet && (
            <>
              {/* Selected Wallet Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{selectedWallet.username}</p>
                        <p className="text-xs text-muted-foreground">Wallet</p>
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-10 hidden sm:block" />
                    <div className="flex gap-4 flex-wrap">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(selectedWallet.balance)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total Top-up</p>
                        <p className="text-lg font-bold font-mono">{formatCurrency(selectedWallet.totalTopup)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                        <p className="text-lg font-bold font-mono text-rose-600">{formatCurrency(selectedWallet.totalSpent)}</p>
                      </div>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openTopup(selectedWallet)}>
                        <ArrowUpCircle className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                        Top-up
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openAdjust(selectedWallet)}>
                        <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-amber-600" />
                        Adjust
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Type Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Filter type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="topup">Top-up</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="plan_renewal">Plan Renewal</SelectItem>
                  </SelectContent>
                </Select>
                {txData && (
                  <span className="text-xs text-muted-foreground">
                    {txData.total} transaction{txData.total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Transactions Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Before</TableHead>
                          <TableHead>After</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              {Array.from({ length: 8 }).map((_, j) => (
                                <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : !txData?.transactions?.length ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                              <p>No transactions found</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          txData.transactions.map((tx) => {
                            const config = TX_TYPE_CONFIG[tx.type] || TX_TYPE_CONFIG.adjustment
                            const Icon = config.icon
                            return (
                              <TableRow key={tx.id}>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Icon className={cn("h-4 w-4", config.color)} />
                                    <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className={cn("font-mono font-semibold", tx.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">{formatCurrency(tx.balanceBefore)}</TableCell>
                                <TableCell className="font-mono text-sm">{formatCurrency(tx.balanceAfter)}</TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate">{tx.description || '—'}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[10px]">{tx.method || '—'}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{tx.performedBy || '—'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
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
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Create Wallet Dialog ───────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Wallet</DialogTitle>
            <DialogDescription>Create a new prepaid wallet for a user</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Username *</Label>
              <Input
                placeholder="Enter RADIUS username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Credit Limit</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={createForm.creditLimit}
                    onChange={(e) => setCreateForm({ ...createForm, creditLimit: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Low Balance Alert</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10.00"
                    value={createForm.lowBalanceAlert}
                    onChange={(e) => setCreateForm({ ...createForm, lowBalanceAlert: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Auto Top-up</Label>
                <p className="text-[11px] text-muted-foreground">Automatically refill when balance is low</p>
              </div>
              <Switch
                checked={createForm.autoTopup}
                onCheckedChange={(v) => setCreateForm({ ...createForm, autoTopup: v })}
              />
            </div>
            {createForm.autoTopup && (
              <div className="grid gap-2">
                <Label>Auto Top-up Amount</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="25.00"
                    value={createForm.autoTopupAmount}
                    onChange={(e) => setCreateForm({ ...createForm, autoTopupAmount: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={createWalletMutation.isPending}>
              {createWalletMutation.isPending ? 'Creating...' : 'Create Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Top-up Dialog ─────────────────────────────────────── */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top-up Wallet</DialogTitle>
            <DialogDescription>
              Add funds to <span className="font-semibold">{selectedWallet?.username}</span>&apos;s wallet
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold font-mono text-emerald-600">{formatCurrency(selectedWallet?.balance ?? 0)}</p>
            </div>
            <div className="grid gap-2">
              <Label>Amount *</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="50.00"
                  value={topupForm.amount}
                  onChange={(e) => setTopupForm({ ...topupForm, amount: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select value={topupForm.method} onValueChange={(v) => setTopupForm({ ...topupForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="admin_adjustment">Admin Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description..."
                value={topupForm.description}
                onChange={(e) => setTopupForm({ ...topupForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitTopup} disabled={topupMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              {topupMutation.isPending ? 'Processing...' : 'Top-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Adjust Balance Dialog ─────────────────────────────── */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              {selectedWallet && (
                <>
                  Adjust balance for <span className="font-semibold">{selectedWallet.username}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Credit limit: {formatCurrency(selectedWallet.creditLimit)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold font-mono">{formatCurrency(selectedWallet?.balance ?? 0)}</p>
            </div>
            <div className="grid gap-2">
              <Label>Adjustment Amount *</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Positive to add, negative to deduct"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Use negative values to deduct balance</p>
            </div>
            <div className="grid gap-2">
              <Label>Reason</Label>
              <Input
                placeholder="Reason for adjustment..."
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitAdjust} disabled={adjustMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {adjustMutation.isPending ? 'Processing...' : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the wallet for &quot;{deleteTarget?.username}&quot;?
              This will also delete all transaction history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  const res = await fetch(`/api/wallets/${deleteTarget.username}`, { method: 'DELETE' })
                  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed') }
                  queryClient.invalidateQueries({ queryKey: ['wallets'] })
                  toast.success('Wallet deleted')
                  setDeleteDialogOpen(false)
                  setDeleteTarget(null)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to delete')
                }
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
