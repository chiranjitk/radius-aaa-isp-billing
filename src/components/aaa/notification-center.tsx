'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950'
  }
}

// ==========================================
// Component
// ==========================================

export function NotificationCenter() {
  const queryClient = useQueryClient()
  const setActiveView = useAppStore((s) => s.setActiveView)

  const { data: notifications = [], isLoading } = useQuery<ApiNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
  })

  const unreadCount = notifications.filter((n) => !n.read).length

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
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount}
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
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
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
        <Separator />

        {/* Notification List */}
        <ScrollArea className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-default',
                    !notification.read && 'bg-muted/30'
                  )}
                >
                  {/* Icon */}
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
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">{notification.time}</p>
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
