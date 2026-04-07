'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  icon: React.ReactNode
  iconColor: string
  title: string
  description: string
  time: string
  read: boolean
}

const initialNotifications: Notification[] = [
  {
    id: '1',
    icon: <UserPlus className="h-4 w-4" />,
    iconColor: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
    title: 'New user registered: emily.watson',
    description: 'Account created and added to "default" group',
    time: '2 min ago',
    read: false,
  },
  {
    id: '2',
    icon: <Server className="h-4 w-4" />,
    iconColor: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
    title: 'NAS DC1-CORE-01 status changed to UP',
    description: 'Device is now reachable and accepting RADIUS requests',
    time: '15 min ago',
    read: false,
  },
  {
    id: '3',
    icon: <AlertTriangle className="h-4 w-4" />,
    iconColor: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950',
    title: 'Invoice INV-2024-0018 overdue',
    description: 'Payment for $89.99 was due on March 1, 2024',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '4',
    icon: <Clock className="h-4 w-4" />,
    iconColor: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950',
    title: 'User john.smith session timeout',
    description: 'Session exceeded max duration of 8 hours',
    time: '2 hours ago',
    read: true,
  },
  {
    id: '5',
    icon: <Activity className="h-4 w-4" />,
    iconColor: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950',
    title: "New policy 'Bandwidth Limit 50Mbps' created",
    description: 'Policy applied to group "residential-users"',
    time: '3 hours ago',
    read: true,
  },
  {
    id: '6',
    icon: <DollarSign className="h-4 w-4" />,
    iconColor: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
    title: 'Payment received: $49.99 from sarah.chen',
    description: 'Applied to invoice INV-2024-0022',
    time: '5 hours ago',
    read: true,
  },
  {
    id: '7',
    icon: <WifiOff className="h-4 w-4" />,
    iconColor: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950',
    title: 'NAS BRANCH-03 unreachable',
    description: 'Last contact was 8 hours ago — possible network issue',
    time: '8 hours ago',
    read: true,
  },
]

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const setActiveView = useAppStore((s) => s.setActiveView)

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
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
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />

        {/* Notification List */}
        <ScrollArea className="max-h-96 overflow-y-auto">
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
                    notification.iconColor
                  )}
                >
                  {notification.icon}
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
