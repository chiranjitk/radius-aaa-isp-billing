'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Bell,
  Check,
  AlertTriangle,
  UserPlus,
  Server,
  DollarSign,
  WifiOff,
  Clock,
  Activity,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Loader2,
  Info,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react'

// ==========================================
// Types
// ==========================================

interface ApiNotification {
  id: string
  type: 'auth' | 'session' | 'nas' | 'billing' | 'system'
  title: string
  description: string
  time: string
  severity: 'info' | 'success' | 'warning' | 'error'
  read: boolean
}

type SeverityFilter = 'all' | 'info' | 'success' | 'warning' | 'error'

// ==========================================
// Helpers
// ==========================================

function getNotificationIcon(type: string, severity: string) {
  const size = 'h-4 w-4'
  switch (type) {
    case 'auth':
      return <ShieldCheck className={size} />
    case 'session':
      return <Clock className={size} />
    case 'nas':
      return severity === 'error' ? (
        <WifiOff className={size} />
      ) : (
        <Server className={size} />
      )
    case 'billing':
      return severity === 'warning' ? (
        <AlertTriangle className={size} />
      ) : (
        <DollarSign className={size} />
      )
    case 'system':
      return <Activity className={size} />
    default:
      return <Bell className={size} />
  }
}

function getIconColor(severity: string) {
  switch (severity) {
    case 'error':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950'
    case 'warning':
      return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950'
    case 'success':
      return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950'
    case 'info':
    default:
      return 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-950'
  }
}

function formatRelativeTime(timeStr: string): string {
  try {
    const date = parseISO(timeStr)
    if (isNaN(date.getTime())) return timeStr
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return timeStr
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'error':
      return <XCircle className="h-3.5 w-3.5" />
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5" />
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case 'info':
    default:
      return <Info className="h-3.5 w-3.5" />
  }
}

function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case 'error':
      return 'bg-red-500 text-white hover:bg-red-500'
    case 'warning':
      return 'bg-amber-500 text-white hover:bg-amber-500'
    case 'success':
      return 'bg-emerald-500 text-white hover:bg-emerald-500'
    case 'info':
    default:
      return 'bg-sky-500 text-white hover:bg-sky-500'
  }
}

// ==========================================
// Component
// ==========================================

export function NotificationCenter() {
  const queryClient = useQueryClient()
  const setActiveView = useAppStore((s) => s.setActiveView)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  const { data: notifications = [], isLoading } = useQuery<ApiNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  // Filtered notifications
  const filteredNotifications = severityFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.severity === severityFilter)

  // Count by severity
  const counts = {
    error: notifications.filter((n) => n.severity === 'error').length,
    warning: notifications.filter((n) => n.severity === 'warning').length,
    success: notifications.filter((n) => n.severity === 'success').length,
    info: notifications.filter((n) => n.severity === 'info').length,
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) throw new Error('Failed to mark as read')

      // Invalidate query cache to refetch
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark notifications as read')
    }
  }

  const filterTabs: { key: SeverityFilter; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'text-foreground' },
    { key: 'error', label: 'Errors', color: 'text-red-500' },
    { key: 'warning', label: 'Warnings', color: 'text-amber-500' },
    { key: 'success', label: 'Success', color: 'text-emerald-500' },
    { key: 'info', label: 'Info', color: 'text-sky-500' },
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-background",
              unreadCount >= 3 ? "bg-red-500" : "bg-primary"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className={cn("h-5 px-1.5 text-[10px] font-semibold", getSeverityBadgeClass(
                counts.error > 0 ? 'error' : counts.warning > 0 ? 'warning' : 'info'
              ))}>
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSeverityFilter(tab.key)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap cursor-pointer",
                severityFilter === tab.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <span className={tab.color}>{tab.label}</span>
              {tab.key !== 'all' && counts[tab.key] > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
              )}
            </button>
          ))}
        </div>

        <Separator />

        {/* Notification List */}
        <ScrollArea className="max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">{severityFilter !== 'all' ? `No ${severityFilter} notifications` : 'No notifications'}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-default',
                    !notification.read && 'bg-muted/30'
                  )}
                >
                  {/* Icon with severity-based coloring */}
                  <div
                    className={cn(
                      'flex items-center justify-center h-8 w-8 rounded-full shrink-0 mt-0.5',
                      getIconColor(notification.severity)
                    )}
                  >
                    {getNotificationIcon(notification.type, notification.severity)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-xs leading-snug',
                          !notification.read ? 'font-semibold' : 'font-medium text-foreground'
                        )}
                      >
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {getSeverityIcon(notification.severity)}
                        {!notification.read && (
                          <span className={cn(
                            "h-2 w-2 rounded-full shrink-0 mt-1",
                            notification.severity === 'error' ? "bg-red-500" :
                            notification.severity === 'warning' ? "bg-amber-500" :
                            notification.severity === 'success' ? "bg-emerald-500" : "bg-primary"
                          )} />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notification.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground/70">
                        {formatRelativeTime(notification.time)}
                      </p>
                      <span className="text-[9px] font-mono px-1 py-0 rounded bg-muted text-muted-foreground uppercase">
                        {notification.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setActiveView('sessions')}
          >
            View All Activity
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
