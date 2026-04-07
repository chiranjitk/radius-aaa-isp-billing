'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  Search,
  Eye,
  CreditCard,
  Send,
  Download,
  FileSpreadsheet,
  FileJson,
  X,
  MoreHorizontal,
  Trash2,
  Edit3,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'

// ============ Types ============
interface InvoiceUser {
  id: string
  username: string
  fullName: string | null
  email: string | null
}

interface InvoicePlan {
  id: string
  name: string
}

interface InvoicePayment {
  id: string
  paymentNo: string
  amount: number
  method: string
  gateway: string | null
  transactionId: string | null
  status: string
  paidAt: string
}

interface Invoice {
  id: string
  invoiceNo: string
  username: string
  planId: string | null
  subscriptionId: string | null
  amount: number
  tax: number
  total: number
  status: string
  dueDate: string
  paidDate: string | null
  notes: string | null
  createdAt: string
  user: InvoiceUser
  plan: InvoicePlan | null
  subscription: { id: string } | null
  payments: InvoicePayment[]
}

interface Plan {
  id: string
  name: string
  price: number
}

interface BillingSummary {
  totalRevenue: number
  pendingAmount: number
  overdueCount: number
  thisMonthCollections: number
}

// ============ Helpers ============
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getStatusBadge(status: string) {
  const variants: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    refunded: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  }
  return variants[status] || 'bg-gray-100 text-gray-600'
}

// ============ Component ============
export function BillingView() {
  // State
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<BillingSummary>({ totalRevenue: 0, pendingAmount: 0, overdueCount: 0, thisMonthCollections: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)

  // Form state
  const [users, setUsers] = useState<{ username: string; fullName: string | null }[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [createForm, setCreateForm] = useState({
    username: '',
    planId: '',
    amount: '',
    tax: '10',
    total: '',
    dueDate: '',
    notes: '',
  })
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: '',
    gateway: '',
    transactionId: '',
  })

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', page.toString())
      params.set('pageSize', '15')

      const res = await fetch(`/api/billing?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setInvoices(data.invoices)
      setTotalPages(data.totalPages)
      setSummary(data.summary)
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, dateFrom, dateTo, page])

  // Fetch dropdown data
  const fetchDropdownData = useCallback(async () => {
    try {
      const [usersRes, plansRes] = await Promise.all([
        fetch('/api/users?limit=1000'),
        fetch('/api/plans?limit=100'),
      ])
      if (usersRes.ok) {
        const uData = await usersRes.json()
        setUsers((uData.users || []).map((u: { username: string; fullName: string | null }) => ({ username: u.username, fullName: u.fullName })))
      }
      if (plansRes.ok) {
        const pData = await plansRes.json()
        setPlans((pData.plans || []).map((p: { id: string; name: string; price: number }) => ({ id: p.id, name: p.name, price: p.price })))
      }
    } catch {
      // Silently fail — dropdowns will be empty
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    fetchDropdownData()
  }, [fetchDropdownData])

  // Auto-calc total when amount or tax changes
  useEffect(() => {
    const amt = parseFloat(createForm.amount)
    const taxRate = parseFloat(createForm.tax)
    if (!isNaN(amt) && !isNaN(taxRate)) {
      setCreateForm((prev) => ({ ...prev, total: (amt + amt * (taxRate / 100)).toFixed(2) }))
    }
  }, [createForm.amount, createForm.tax])

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!createForm.username || !createForm.amount || !createForm.total || !createForm.dueDate) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createForm.username,
          planId: createForm.planId || null,
          amount: createForm.amount,
          tax: (parseFloat(createForm.amount) * parseFloat(createForm.tax || 0) / 100).toFixed(2),
          total: createForm.total,
          dueDate: createForm.dueDate,
          notes: createForm.notes,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      toast.success('Invoice created successfully')
      setCreateDialogOpen(false)
      setCreateForm({ username: '', planId: '', amount: '', tax: '10', total: '', dueDate: '', notes: '' })
      fetchInvoices()
    } catch {
      toast.error('Failed to create invoice')
    }
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentForm.amount || !paymentForm.method) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      const res = await fetch(`/api/billing/${selectedInvoice.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      })
      if (!res.ok) throw new Error('Failed to record payment')
      toast.success('Payment recorded successfully')
      setPaymentDialogOpen(false)
      setPaymentForm({ amount: '', method: '', gateway: '', transactionId: '' })
      fetchInvoices()
      if (detailSheetOpen) {
        // Refresh detail view
        const detailRes = await fetch(`/api/billing/${selectedInvoice.id}`)
        if (detailRes.ok) setSelectedInvoice(await detailRes.json())
      }
    } catch {
      toast.error('Failed to record payment')
    }
  }

  // View invoice detail
  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/billing/${invoice.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedInvoice(data)
        setDetailSheetOpen(true)
      }
    } catch {
      toast.error('Failed to load invoice details')
    }
  }

  // Delete invoice - confirmed action
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return
    try {
      const res = await fetch(`/api/billing/${invoiceToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Invoice deleted successfully')
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
      fetchInvoices()
    } catch {
      toast.error('Failed to delete invoice')
    }
  }

  // Request delete confirmation
  const requestDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!invoices.length || loading} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Invoices Export',
                  headers: ['Invoice #', 'Username', 'Plan', 'Amount', 'Tax', 'Total', 'Status', 'Due Date', 'Paid Date', 'Created At'],
                  filename: `invoices-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: invoices.map((inv) => [
                    inv.invoiceNo,
                    inv.username,
                    inv.plan?.name || '',
                    inv.amount,
                    inv.tax,
                    inv.total,
                    inv.status,
                    formatDate(inv.dueDate),
                    formatDate(inv.paidDate),
                    formatDate(inv.createdAt),
                  ]),
                }
                exportToCSV(opts)
                toast.success(`${invoices.length} invoices exported as CSV`)
              }}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const opts: ExportOptions = {
                  title: 'Invoices Export',
                  headers: ['Invoice #', 'Username', 'Plan', 'Amount', 'Tax', 'Total', 'Status', 'Due Date', 'Paid Date', 'Created At'],
                  filename: `invoices-export-${new Date().toISOString().slice(0, 10)}`,
                  rows: invoices.map((inv) => [
                    inv.invoiceNo,
                    inv.username,
                    inv.plan?.name || '',
                    inv.amount,
                    inv.tax,
                    inv.total,
                    inv.status,
                    formatDate(inv.dueDate),
                    formatDate(inv.paidDate),
                    formatDate(inv.createdAt),
                  ]),
                }
                exportToJSON(opts)
                toast.success(`${invoices.length} invoices exported as JSON`)
              }}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Row */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-lg font-bold">{formatCurrency(summary.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(summary.pendingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overdue Invoices</p>
                  <p className="text-lg font-bold">{summary.overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month Collections</p>
                  <p className="text-lg font-bold">{formatCurrency(summary.thisMonthCollections)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by username or invoice #..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="w-full sm:w-40"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="w-full sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No invoices found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Get started by creating your first invoice for a user.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-card z-10">Invoice #</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10">User</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10">Plan</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-right">Amount</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-right">Tax</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-right">Total</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10">Status</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10">Due Date</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10">Paid Date</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.invoiceNo}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{inv.user?.fullName || inv.username}</p>
                            <p className="text-xs text-muted-foreground">{inv.username}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{inv.plan?.name || '—'}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(inv.amount)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(inv.tax)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(inv.total)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(inv.paidDate)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewInvoice(inv)} className="gap-2">
                                <Eye className="h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedInvoice(inv)
                                    setPaymentForm({ amount: inv.total.toString(), method: '', gateway: '', transactionId: '' })
                                    setPaymentDialogOpen(true)
                                  }}
                                  className="gap-2"
                                >
                                  <CreditCard className="h-4 w-4" /> Record Payment
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toast.info('Reminder sent (mock)')} className="gap-2">
                                <Send className="h-4 w-4" /> Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('PDF download started (mock)')} className="gap-2">
                                <Download className="h-4 w-4" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => requestDeleteInvoice(inv)} className="gap-2 text-red-600 focus:text-red-600">
                                <Trash2 className="h-4 w-4" /> Delete
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== Delete Confirmation Dialog ===== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open)
        if (!open) setInvoiceToDelete(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{' '}
              <span className="font-semibold">{invoiceToDelete?.invoiceNo}</span>?
              This action cannot be undone. All associated payment records will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Create Invoice Dialog ===== */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Create a new invoice for a user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>User *</Label>
              <Select value={createForm.username} onValueChange={(v) => setCreateForm((p) => ({ ...p, username: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.username} value={u.username}>
                      {u.fullName ? `${u.fullName} (${u.username})` : u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Plan</Label>
              <Select value={createForm.planId} onValueChange={(v) => setCreateForm((p) => ({ ...p, planId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tax %</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={createForm.tax}
                  onChange={(e) => setCreateForm((p) => ({ ...p, tax: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Total (auto-calculated)</Label>
              <Input type="text" value={createForm.total ? formatCurrency(parseFloat(createForm.total)) : ''} readOnly className="bg-muted" />
            </div>
            <div className="grid gap-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Invoice notes..."
                value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Record Payment Dialog ===== */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedInvoice?.invoiceNo}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
              />
              {selectedInvoice && (
                <p className="text-xs text-muted-foreground">
                  Outstanding: {formatCurrency(selectedInvoice.total - selectedInvoice.payments.reduce((s, p) => s + p.amount, 0))}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Payment Method *</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm((p) => ({ ...p, method: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Gateway</Label>
              <Input
                placeholder="e.g., Stripe, PayPal..."
                value={paymentForm.gateway}
                onChange={(e) => setPaymentForm((p) => ({ ...p, gateway: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Transaction ID</Label>
              <Input
                placeholder="Transaction reference..."
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm((p) => ({ ...p, transactionId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Invoice Detail Sheet ===== */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invoice {selectedInvoice?.invoiceNo}</SheetTitle>
            <SheetDescription>Invoice details and payment history</SheetDescription>
          </SheetHeader>
          {selectedInvoice && (
            <div className="mt-6 space-y-6">
              {/* Invoice Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                  <span className="text-xs text-muted-foreground">Created {formatDate(selectedInvoice.createdAt)}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedInvoice.user?.fullName || selectedInvoice.username}</p>
                    <p className="text-xs text-muted-foreground">{selectedInvoice.username}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium">{selectedInvoice.plan?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid Date</p>
                    <p className="font-medium">{formatDate(selectedInvoice.paidDate)}</p>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedInvoice.tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {selectedInvoice.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Payment History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Payment History</h3>
                {selectedInvoice.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No payments recorded</p>
                ) : (
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{payment.paymentNo}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.method} {payment.gateway ? `· ${payment.gateway}` : ''} · {formatDate(payment.paidAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(payment.amount)}</p>
                          <span className="text-xs capitalize text-emerald-600">{payment.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Paid */}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Paid</span>
                <span className="text-lg font-bold">
                  {formatCurrency(selectedInvoice.payments.reduce((s, p) => s + p.amount, 0))}
                </span>
              </div>
              {selectedInvoice.total - selectedInvoice.payments.reduce((s, p) => s + p.amount, 0) > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm">Outstanding</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(selectedInvoice.total - selectedInvoice.payments.reduce((s, p) => s + p.amount, 0))}
                  </span>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
