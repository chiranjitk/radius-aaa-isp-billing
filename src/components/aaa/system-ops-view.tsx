'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  HardDrive,
  DatabaseBackup,
  Play,
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Activity,
  Server,
  Cpu,
  MemoryStick,
  Shield,
  Edit2,
  Zap,
  CalendarClock,
  Pause,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function relativeTime(date: string | Date | null): string {
  if (!date) return 'Never'
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

// ─── Stat Card Component ────────────────────────────────────
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-emerald-600 dark:text-emerald-400',
  bgColor = 'bg-emerald-50 dark:bg-emerald-950/20',
  borderColor = 'border-emerald-200/60 dark:border-emerald-800/40',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  iconColor?: string
  bgColor?: string
  borderColor?: string
}) {
  return (
    <Card className={cn('card-hover border', borderColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-xl font-bold tabular-nums mt-1 truncate">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', bgColor)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ─────────────────────────────────────────
export function SystemOpsView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('backups')

  // Backup state
  const [backupDialogOpen, setBackupDialogOpen] = useState(false)
  const [backupName, setBackupName] = useState('')
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('full')
  const [backupNotes, setBackupNotes] = useState('')
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null)

  // Cron job state
  const [cronDialogOpen, setCronDialogOpen] = useState(false)
  const [editCronJob, setEditCronJob] = useState<any>(null)
  const [cronName, setCronName] = useState('')
  const [cronDescription, setCronDescription] = useState('')
  const [cronSchedule, setCronSchedule] = useState('')
  const [cronCommand, setCronCommand] = useState('')
  const [cronTimeout, setCronTimeout] = useState('300')
  const [deleteCronId, setDeleteCronId] = useState<string | null>(null)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)

  // ─── Queries ──────────────────────────────────────────────
  const { data: backupsData, isLoading: backupsLoading } = useQuery({
    queryKey: ['system-ops-backups'],
    queryFn: async () => {
      const res = await fetch('/api/system-ops/backups')
      if (!res.ok) throw new Error('Failed to fetch backups')
      return res.json()
    },
  })

  const { data: cronData, isLoading: cronLoading } = useQuery({
    queryKey: ['system-ops-cron-jobs'],
    queryFn: async () => {
      const res = await fetch('/api/system-ops/cron-jobs')
      if (!res.ok) throw new Error('Failed to fetch cron jobs')
      return res.json()
    },
  })

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['system-ops-health'],
    queryFn: async () => {
      const res = await fetch('/api/system-ops/health')
      if (!res.ok) throw new Error('Failed to fetch health')
      return res.json()
    },
    refetchInterval: 30000,
  })

  // ─── Mutations ────────────────────────────────────────────
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/system-ops/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: backupName, type: backupType, notes: backupNotes || null }),
      })
      if (!res.ok) throw new Error('Failed to create backup')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-ops-backups'] })
      toast.success('Backup created successfully')
      setBackupDialogOpen(false)
      setBackupName('')
      setBackupType('full')
      setBackupNotes('')
    },
    onError: () => toast.error('Failed to create backup'),
  })

  const deleteBackupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/system-ops/backups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete backup')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-ops-backups'] })
      toast.success('Backup deleted')
      setDeleteBackupId(null)
    },
    onError: () => toast.error('Failed to delete backup'),
  })

  const createCronJobMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: cronName,
        schedule: cronSchedule,
        command: cronCommand,
        timeout: parseInt(cronTimeout) || 300,
      }
      if (cronDescription) payload.description = cronDescription

      if (editCronJob) {
        const res = await fetch(`/api/system-ops/cron-jobs/${editCronJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update cron job')
        return res.json()
      } else {
        const res = await fetch('/api/system-ops/cron-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create cron job')
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-ops-cron-jobs'] })
      toast.success(editCronJob ? 'Cron job updated' : 'Cron job created')
      setCronDialogOpen(false)
      resetCronForm()
    },
    onError: () => toast.error(editCronJob ? 'Failed to update cron job' : 'Failed to create cron job'),
  })

  const toggleCronJobMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/system-ops/cron-jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to toggle cron job')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-ops-cron-jobs'] })
      toast.success('Cron job status updated')
    },
    onError: () => toast.error('Failed to update cron job'),
  })

  const runCronJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/system-ops/cron-jobs/${id}/run`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to run cron job')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-ops-cron-jobs'] })
      if (data.result?.success) {
        toast.success(`Job completed in ${data.result.duration}ms`)
      } else {
        toast.error(`Job failed: exit code ${data.result?.exitCode}`)
      }
      setRunningJobId(null)
    },
    onError: () => {
      toast.error('Failed to run cron job')
      setRunningJobId(null)
    },
  })

  const deleteCronJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/system-ops/cron-jobs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete cron job')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-ops-cron-jobs'] })
      toast.success('Cron job deleted')
      setDeleteCronId(null)
    },
    onError: () => toast.error('Failed to delete cron job'),
  })

  function resetCronForm() {
    setEditCronJob(null)
    setCronName('')
    setCronDescription('')
    setCronSchedule('')
    setCronCommand('')
    setCronTimeout('300')
  }

  function openEditCronDialog(job: any) {
    setEditCronJob(job)
    setCronName(job.name)
    setCronDescription(job.description ?? '')
    setCronSchedule(job.schedule)
    setCronCommand(job.command)
    setCronTimeout(String(job.timeout ?? 300))
    setCronDialogOpen(true)
  }

  const backups = backupsData?.backups ?? []
  const backupStats = backupsData?.stats ?? { total: 0, totalSize: 0, completed: 0, failed: 0, latest: null }
  const cronJobs = cronData?.cronJobs ?? []
  const cronStats = cronData?.stats ?? { total: 0, active: 0, disabled: 0, error: 0, totalRuns: 0, totalFailures: 0 }
  const health = healthData

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed':
      case 'active':
      case 'running':
      case 'healthy':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40'
      case 'disabled':
      case 'warning':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40'
      case 'failed':
      case 'error':
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40'
      case 'pending':
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-800/40'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  const memPercent = health?.system?.memory?.usagePercent ?? 0
  const diskPercent = health?.system?.disk?.usagePercent ?? 0

  return (
    <div className="space-y-6">
      {/* ─── System Health Panel ──────────────────────────── */}
      <Card className="border border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-200/60 dark:border-emerald-800/40">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">System Health</CardTitle>
                <CardDescription className="text-[10px]">Real-time system monitoring</CardDescription>
              </div>
            </div>
            {healthLoading ? (
              <Skeleton className="h-5 w-20 rounded" />
            ) : (
              <Badge variant="outline" className={cn('text-[10px] font-bold px-2 h-5 rounded-full border', statusColor(health?.status))}>
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full mr-1.5',
                  health?.status === 'healthy' ? 'bg-emerald-500 status-pulse' :
                  health?.status === 'warning' ? 'bg-amber-500' : 'bg-red-500 status-pulse'
                )} />
                {health?.status?.charAt(0).toUpperCase() + health?.status?.slice(1)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* CPU */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Cpu className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span className="text-[11px] font-medium text-muted-foreground">CPU Load</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{health?.system?.cpu?.loadAvg1m ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground">1m avg / {health?.system?.cpu?.cores ?? '—'} cores</p>
              </div>
              {/* Memory */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <MemoryStick className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-medium text-muted-foreground">Memory</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{memPercent}%</p>
                <Progress value={memPercent} className="mt-1 h-1.5" />
                <p className="text-[10px] text-muted-foreground">{formatBytes(health?.system?.memory?.used ?? 0)} / {formatBytes(health?.system?.memory?.total ?? 0)}</p>
              </div>
              {/* Disk */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <HardDrive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-medium text-muted-foreground">Disk</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{diskPercent}%</p>
                <Progress value={diskPercent} className="mt-1 h-1.5" />
                <p className="text-[10px] text-muted-foreground">{formatBytes(health?.system?.disk?.used ?? 0)} / {formatBytes(health?.system?.disk?.total ?? 0)}</p>
              </div>
              {/* Uptime */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="text-[11px] font-medium text-muted-foreground">Uptime</span>
                </div>
                <p className="text-lg font-bold tabular-nums">{health?.system?.uptime?.formatted ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground">Node {health?.system?.nodeVersion ?? '—'}</p>
              </div>
            </div>
          )}

          {/* Services Row */}
          {!healthLoading && (
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.entries(health?.services ?? {}).map(([name, svc]: [string, any]) => (
                <div key={name} className="flex items-center gap-2 rounded-full border px-3 py-1.5 bg-muted/20">
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    svc.status === 'running' ? 'bg-emerald-500 status-pulse' : 'bg-red-500'
                  )} />
                  <span className="text-[11px] font-medium capitalize">{name}</span>
                  <span className="text-[10px] text-muted-foreground">v{svc.version ?? svc.port ?? ''}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[320px]">
          <TabsTrigger value="backups" className="text-xs gap-1.5">
            <DatabaseBackup className="h-3.5 w-3.5" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="cron-jobs" className="text-xs gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Cron Jobs
          </TabsTrigger>
        </TabsList>

        {/* ─── BACKUPS TAB ───────────────────────────────── */}
        <TabsContent value="backups" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Total Backups"
              value={backupStats.total}
              icon={DatabaseBackup}
              iconColor="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-50 dark:bg-emerald-950/20"
              borderColor="border-emerald-200/60 dark:border-emerald-800/40"
            />
            <StatCard
              title="Total Size"
              value={formatBytes(backupStats.totalSize)}
              icon={HardDrive}
              iconColor="text-amber-600 dark:text-amber-400"
              bgColor="bg-amber-50 dark:bg-amber-950/20"
              borderColor="border-amber-200/60 dark:border-amber-800/40"
            />
            <StatCard
              title="Completed"
              value={backupStats.completed}
              icon={CheckCircle2}
              iconColor="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-50 dark:bg-emerald-950/20"
              borderColor="border-emerald-200/60 dark:border-emerald-800/40"
            />
            <StatCard
              title="Failed"
              value={backupStats.failed}
              icon={XCircle}
              iconColor="text-red-600 dark:text-red-400"
              bgColor="bg-red-50 dark:bg-red-950/20"
              borderColor="border-red-200/60 dark:border-red-800/40"
            />
          </div>

          {/* Actions + Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Backup History</CardTitle>
                  <CardDescription className="text-[10px]">Database backup records and management</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setBackupDialogOpen(true)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Backup
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[10px] font-semibold h-8">Name</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8">Type</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8 hidden md:table-cell">Size</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8">Status</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8 hidden lg:table-cell">Created</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupsLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <DatabaseBackup className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">No backups yet</p>
                          <p className="text-[10px] text-muted-foreground/60">Create your first backup to get started</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup: any) => (
                        <TableRow key={backup.id} className="group">
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <DatabaseBackup className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{backup.name}</p>
                                {backup.notes && (
                                  <p className="text-[10px] text-muted-foreground truncate">{backup.notes}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className={cn(
                              'text-[9px] font-bold px-1.5 h-5 rounded capitalize',
                              backup.type === 'full'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/40'
                                : 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border-teal-200/60 dark:border-teal-800/40'
                            )}>
                              {backup.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 hidden md:table-cell">
                            <span className="text-xs tabular-nums">{formatBytes(backup.fileSize ?? 0)}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 h-5 rounded', statusColor(backup.status))}>
                              {backup.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {backup.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                              {backup.status === 'pending' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                              {backup.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 hidden lg:table-cell">
                            <span className="text-[11px] text-muted-foreground">{relativeTime(backup.createdAt)}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteBackupId(backup.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

        {/* ─── CRON JOBS TAB ──────────────────────────────── */}
        <TabsContent value="cron-jobs" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Total Jobs"
              value={cronStats.total}
              icon={CalendarClock}
              iconColor="text-slate-600 dark:text-slate-400"
              bgColor="bg-slate-50 dark:bg-slate-950/20"
              borderColor="border-slate-200/60 dark:border-slate-800/40"
            />
            <StatCard
              title="Active"
              value={cronStats.active}
              icon={CheckCircle2}
              iconColor="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-50 dark:bg-emerald-950/20"
              borderColor="border-emerald-200/60 dark:border-emerald-800/40"
            />
            <StatCard
              title="Disabled"
              value={cronStats.disabled}
              icon={Pause}
              iconColor="text-amber-600 dark:text-amber-400"
              bgColor="bg-amber-50 dark:bg-amber-950/20"
              borderColor="border-amber-200/60 dark:border-amber-800/40"
            />
            <StatCard
              title="Errors"
              value={cronStats.error}
              icon={AlertTriangle}
              iconColor="text-red-600 dark:text-red-400"
              bgColor="bg-red-50 dark:bg-red-950/20"
              borderColor="border-red-200/60 dark:border-red-800/40"
            />
            <StatCard
              title="Total Runs"
              value={cronStats.totalRuns}
              icon={Zap}
              iconColor="text-violet-600 dark:text-violet-400"
              bgColor="bg-violet-50 dark:bg-violet-950/20"
              borderColor="border-violet-200/60 dark:border-violet-800/40"
            />
            <StatCard
              title="Total Failures"
              value={cronStats.totalFailures}
              icon={XCircle}
              iconColor="text-red-600 dark:text-red-400"
              bgColor="bg-red-50 dark:bg-red-950/20"
              borderColor="border-red-200/60 dark:border-red-800/40"
            />
          </div>

          {/* Actions + Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Cron Job Manager</CardTitle>
                  <CardDescription className="text-[10px]">Scheduled tasks and automated jobs</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    resetCronForm()
                    setCronDialogOpen(true)
                  }}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Job
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[10px] font-semibold h-8">Job Name</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8 hidden md:table-cell">Schedule</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8">Status</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8 hidden lg:table-cell">Last Run</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8 hidden lg:table-cell">Runs / Fails</TableHead>
                      <TableHead className="text-[10px] font-semibold h-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cronLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(6)].map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : cronJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">No cron jobs configured</p>
                          <p className="text-[10px] text-muted-foreground/60">Create a new scheduled task to get started</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      cronJobs.map((job: any) => (
                        <TableRow key={job.id} className="group">
                          <TableCell className="py-2.5">
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{job.name}</p>
                              {job.description && (
                                <p className="text-[10px] text-muted-foreground truncate">{job.description}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">{job.command}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 hidden md:table-cell">
                            <code className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">{job.schedule}</code>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 h-5 rounded', statusColor(job.status))}>
                              {job.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {job.status === 'disabled' && <Pause className="h-3 w-3 mr-1" />}
                              {job.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {job.status === 'running' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 hidden lg:table-cell">
                            <span className="text-[11px] text-muted-foreground">{relativeTime(job.lastRunAt)}</span>
                          </TableCell>
                          <TableCell className="py-2.5 hidden lg:table-cell">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{job.runCount}</span>
                              <span className="text-muted-foreground/40">/</span>
                              <span className={cn('tabular-nums', job.failCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{job.failCount}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                                title="Run Now"
                                disabled={runningJobId === job.id || job.status === 'disabled'}
                                onClick={() => {
                                  setRunningJobId(job.id)
                                  runCronJobMutation.mutate(job.id)
                                }}
                              >
                                {runningJobId === job.id
                                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  : <Play className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title={job.status === 'active' ? 'Disable' : 'Enable'}
                                onClick={() => toggleCronJobMutation.mutate({
                                  id: job.id,
                                  status: job.status === 'active' ? 'disabled' : 'active',
                                })}
                              >
                                {job.status === 'active'
                                  ? <Pause className="h-3.5 w-3.5" />
                                  : <Play className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title="Edit"
                                onClick={() => openEditCronDialog(job)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Delete"
                                onClick={() => setDeleteCronId(job.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
      </Tabs>

      {/* ─── Create Backup Dialog ────────────────────────── */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <DatabaseBackup className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Create Backup
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a new database backup. Full backups include all data, incremental backups only include changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Backup Name</Label>
              <Input
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="e.g., Daily Full Backup"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Backup Type</Label>
              <Select value={backupType} onValueChange={(v) => setBackupType(v as 'full' | 'incremental')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">
                    <div className="flex items-center gap-2">
                      <DatabaseBackup className="h-3.5 w-3.5" />
                      Full Backup
                    </div>
                  </SelectItem>
                  <SelectItem value="incremental">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Incremental Backup
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="text-xs min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBackupDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!backupName || createBackupMutation.isPending}
              onClick={() => createBackupMutation.mutate()}
            >
              {createBackupMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <DatabaseBackup className="h-3.5 w-3.5 mr-1.5" />
                  Create Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Backup Alert ─────────────────────────── */}
      <AlertDialog open={!!deleteBackupId} onOpenChange={() => setDeleteBackupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Backup</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this backup record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBackupId && deleteBackupMutation.mutate(deleteBackupId)}
              disabled={deleteBackupMutation.isPending}
            >
              {deleteBackupMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Create/Edit Cron Job Dialog ─────────────────── */}
      <Dialog open={cronDialogOpen} onOpenChange={(open) => {
        setCronDialogOpen(open)
        if (!open) resetCronForm()
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              {editCronJob ? 'Edit Cron Job' : 'New Cron Job'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure a scheduled task with a cron expression. Use standard 5-field cron format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Job Name *</Label>
                <Input
                  value={cronName}
                  onChange={(e) => setCronName(e.target.value)}
                  placeholder="e.g., Cleanup Sessions"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Timeout (seconds)</Label>
                <Input
                  value={cronTimeout}
                  onChange={(e) => setCronTimeout(e.target.value)}
                  placeholder="300"
                  type="number"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={cronDescription}
                onChange={(e) => setCronDescription(e.target.value)}
                placeholder="Brief description of the job"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                Schedule (Cron Expression) *
                <code className="text-[9px] bg-muted px-1 py-0.5 rounded font-mono text-muted-foreground">min hr day mon wk</code>
              </Label>
              <Input
                value={cronSchedule}
                onChange={(e) => setCronSchedule(e.target.value)}
                placeholder="e.g., 0 2 * * * (daily at 2 AM)"
                className="h-8 text-xs font-mono"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Every 5 min', value: '*/5 * * * *' },
                  { label: 'Hourly', value: '0 * * * *' },
                  { label: 'Daily', value: '0 2 * * *' },
                  { label: 'Weekly', value: '0 0 * * 0' },
                  { label: 'Monthly', value: '0 0 1 * *' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCronSchedule(preset.value)}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded border transition-colors',
                      cronSchedule === preset.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted border-border'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Command *</Label>
              <Textarea
                value={cronCommand}
                onChange={(e) => setCronCommand(e.target.value)}
                placeholder="e.g., /usr/bin/cleanup-stale-sessions.sh"
                className="text-xs font-mono min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCronDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!cronName || !cronSchedule || !cronCommand || createCronJobMutation.isPending}
              onClick={() => createCronJobMutation.mutate()}
            >
              {createCronJobMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                  {editCronJob ? 'Update Job' : 'Create Job'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Cron Job Alert ───────────────────────── */}
      <AlertDialog open={!!deleteCronId} onOpenChange={() => setDeleteCronId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Cron Job</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently remove this scheduled task. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCronId && deleteCronJobMutation.mutate(deleteCronId)}
              disabled={deleteCronJobMutation.isPending}
            >
              {deleteCronJobMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SystemOpsView
