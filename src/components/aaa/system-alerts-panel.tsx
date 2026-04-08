'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Bell,
  X,
  Filter,
  WifiOff,
  ShieldAlert,
  Database,
  Clock,
  UserPlus,
  BookOpen,
  HardDrive,
  CreditCard,
  RefreshCw,
  Trash2,
  ChevronRight,
  BellOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ==========================================
// Types
// ==========================================

type Severity = 'critical' | 'warning' | 'info' | 'success'

interface SystemAlert {
  id: string
  severity: Severity
  title: string
  description: string
  timestamp: Date
  isNew: boolean
}

// ==========================================
// Severity Configuration
// ==========================================

const SEVERITY_CONFIG: Record<Severity, {
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  badgeClass: string
  label: string
  iconBg: string
  iconText: string
}> = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-l-red-500',
    badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
    label: 'Critical',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconText: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-l-amber-500',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    label: 'Warning',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    borderColor: 'border-l-sky-500',
    badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
    label: 'Info',
    iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    iconText: 'text-sky-600 dark:text-sky-400',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-l-emerald-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    label: 'Success',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
  },
}

// ==========================================
// Simulated Alert Data
// ==========================================

const ALERT_TEMPLATES: Array<{ severity: Severity; title: string; description: string }> = [
  // Critical alerts
  { severity: 'critical', title: 'NAS Unreachable', description: 'BR-Router-03 at 10.0.3.1 is not responding to RADIUS requests. 12 active sessions may be affected.' },
  { severity: 'critical', title: 'Auth Failure Spike', description: 'Authentication failure rate exceeded threshold: 47 failures in the last 5 minutes from 192.168.1.100.' },
  { severity: 'critical', title: 'DB Connection Pool Exhausted', description: 'SQLite connection pool at 98% capacity. Performance degradation detected. Restart recommended.' },
  { severity: 'critical', title: 'Certificate Expiring Soon', description: 'RADIUS TLS certificate expires in 3 days. Renew to prevent EAP-TLS authentication failures.' },
  // Warning alerts
  { severity: 'warning', title: 'High Bandwidth Usage', description: 'NAS MikroTik-AP-01 exceeds 900 Mbps sustained throughput. Consider upgrading link capacity.' },
  { severity: 'warning', title: 'Session Timeout Rate Up', description: 'Session timeout rate increased 23% in the last hour. Check NAS connectivity and network latency.' },
  { severity: 'warning', title: 'Certificate Expiring', description: 'RADIUS server certificate expires in 14 days. Schedule renewal to prevent service interruption.' },
  { severity: 'warning', title: 'Memory Usage High', description: 'System memory usage at 82%. Consider restarting FreeRADIUS or adding more resources.' },
  { severity: 'warning', title: 'NAS Response Latency', description: 'Average RADIUS response time increased to 450ms for DC-Switch-01. Investigate network path.' },
  // Info alerts
  { severity: 'info', title: 'New User Registered', description: 'User chris.park created via self-registration portal with EAP-PEAP authentication type.' },
  { severity: 'info', title: 'Dictionary Updated', description: 'RADIUS dictionary updated: added 12 MikroTik vendor-specific attributes (v3.45).' },
  { severity: 'info', title: 'Backup Completed', description: 'Daily database backup completed successfully. Archive size: 2.4 MB, duration: 0.8s.' },
  { severity: 'info', title: 'System Update Available', description: 'FreeRADIUS v3.2.5 available. Current version: v3.2.3. Review changelog for breaking changes.' },
  { severity: 'info', title: 'Policy Review Due', description: 'Rate-Limit and Bandwidth-Cap policies have not been reviewed in 90 days. Schedule review.' },
  // Success alerts
  { severity: 'success', title: 'NAS Reconnected', description: 'MikroTik-AP-03 successfully re-established RADIUS connection after 4 minutes downtime.' },
  { severity: 'success', title: 'Payment Received', description: 'Invoice #INV-0148 payment of $29.99 received from user john.doe via credit card.' },
  { severity: 'success', title: 'Policy Deployed', description: 'Updated Bandwidth-Cap policy successfully deployed to all NAS devices. 9/9 devices confirmed.' },
  { severity: 'success', title: 'Backup Restored', description: 'Emergency database restore completed from backup-2025-03-15. All services operational.' },
]

function generateInitialAlerts(): SystemAlert[] {
  const now = Date.now()
  return ALERT_TEMPLATES.slice(0, 12).map((t, i) => ({
    id: `alert-init-${i}-${now}`,
    severity: t.severity,
    title: t.title,
    description: t.description,
    timestamp: new Date(now - (i * 5 + Math.random() * 10) * 60000),
    isNew: false,
  }))
}

function generateRandomAlert(): SystemAlert {
  const template = ALERT_TEMPLATES[Math.floor(Math.random() * ALERT_TEMPLATES.length)]
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    severity: template.severity,
    title: template.title,
    description: template.description,
    timestamp: new Date(),
    isNew: true,
  }
}

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

// ==========================================
// Filter Button Component
// ==========================================

const FILTER_OPTIONS: Array<{ value: 'all' | Severity; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
]

// ==========================================
// Single Alert Row Component
// ==========================================

function AlertRow({
  alert,
  onAcknowledge,
}: {
  alert: SystemAlert
  onAcknowledge: (id: string) => void
}) {
  const config = SEVERITY_CONFIG[alert.severity]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border-l-[3px] p-3 transition-all duration-200 hover:shadow-sm',
        config.borderColor,
        alert.isNew ? 'animate-fade-in-up bg-muted/30' : 'bg-muted/20 hover:bg-muted/40'
      )}
    >
      {/* Icon */}
      <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', config.iconBg)}>
        <Icon className={cn('h-3.5 w-3.5', config.iconText)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold truncate">{alert.title}</p>
          {alert.isNew && (
            <span className="shrink-0 text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
              New
            </span>
          )}
          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 shrink-0', config.badgeClass)}>
            {config.label}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
          {alert.description}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-muted-foreground/70 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatTimeAgo(alert.timestamp)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onAcknowledge(alert.id)}
          >
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Main Component
// ==========================================

export function SystemAlertsPanel() {
  const [alerts, setAlerts] = useState<SystemAlert[]>(() => generateInitialAlerts())
  const [filter, setFilter] = useState<'all' | Severity>('all')

  // Auto-refresh: add new alert every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts((prev) => {
        // Mark old "new" alerts as not new
        const updated = prev.map(a => ({ ...a, isNew: false }))
        // Add a new random alert
        return [generateRandomAlert(), ...updated.slice(0, 7)]
      })
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const handleAcknowledge = useCallback((id: string) => {
    setAlerts((prev) => prev.filter(a => a.id !== id))
  }, [])

  const handleClearAll = useCallback(() => {
    setAlerts([])
  }, [])

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts.slice(0, 8)
    return alerts.filter(a => a.severity === filter).slice(0, 8)
  }, [alerts, filter])

  // Alert counts by severity
  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, warning: 0, info: 0, success: 0 }
    for (const a of alerts) {
      c[a.severity] = (c[a.severity] || 0) + 1
    }
    return c
  }, [alerts])

  const totalAlerts = alerts.length
  const criticalCount = counts.critical

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              criticalCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
            )}>
              <Bell className={cn(
                'h-4 w-4',
                criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              )} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                System Alerts
                {totalAlerts > 0 && (
                  <Badge className="bg-red-500 text-white hover:bg-red-500 border-0 text-[10px] px-1.5 py-0 h-5 font-bold">
                    {totalAlerts}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {counts.critical > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {counts.critical} Critical
                  </span>
                )}
                {counts.critical > 0 && counts.warning > 0 && ', '}
                {counts.warning > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {counts.warning} Warning
                  </span>
                )}
                {counts.warning > 0 && counts.info > 0 && ', '}
                {counts.info > 0 && (
                  <span className="text-sky-600 dark:text-sky-400 font-medium">
                    {counts.info} Info
                  </span>
                )}
                {counts.info > 0 && counts.success > 0 && ', '}
                {counts.success > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {counts.success} Success
                  </span>
                )}
                {!totalAlerts && 'No active alerts'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {totalAlerts > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] text-muted-foreground hover:text-foreground h-7 px-2"
                onClick={handleClearAll}
              >
                <BellOff className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Buttons */}
        <div className="flex items-center gap-1 mb-3">
          <Filter className="h-3 w-3 text-muted-foreground mr-1 shrink-0" />
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.value
            const count = opt.value === 'all' ? totalAlerts : (counts[opt.value] || 0)

            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  'text-[10px] font-medium px-2 py-1 rounded-md transition-all duration-150',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {opt.label}
                {count > 0 && (
                  <span className={cn(
                    'ml-1',
                    isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Alert List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {filter === 'all' ? 'All clear!' : `No ${filter} alerts`}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {filter === 'all'
                  ? 'No active system alerts'
                  : `No active ${SEVERITY_CONFIG[filter as Severity].label.toLowerCase()} alerts`}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
              />
            ))
          )}
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
          <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '3s' }} />
          Auto-refreshing every 60s
        </div>
      </CardContent>
    </Card>
  )
}
