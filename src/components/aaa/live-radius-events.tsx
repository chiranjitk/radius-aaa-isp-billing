'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Wifi,
  WifiOff,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Zap,
  AlertTriangle,
  Info,
  CheckCircle2,
  Radio,
  Activity,
  UserPlus,
  UserMinus,
  Clock,
  RefreshCw,
  Bell,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'

// ==========================================
// Types
// ==========================================

interface RadiusEvent {
  id: string
  type: string
  severity: 'success' | 'warning' | 'info' | 'error'
  message: string
  timestamp: string
  data: {
    user?: string
    nas?: string
    ip?: string
    sessionIp?: string
  }
}

// ==========================================
// Severity Configuration
// ==========================================

const SEVERITY_CONFIG: Record<string, {
  icon: React.ElementType
  color: string
  bgClass: string
  borderClass: string
  badgeClass: string
}> = {
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderClass: 'border-emerald-500/30',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    borderClass: 'border-amber-500/30',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
  },
  info: {
    icon: Info,
    color: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-100 dark:bg-sky-900/30',
    borderClass: 'border-sky-500/30',
    badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
  },
  error: {
    icon: ShieldX,
    color: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    borderClass: 'border-red-500/30',
    badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
  },
}

const TYPE_LABELS: Record<string, string> = {
  auth_success: 'Auth ✓',
  auth_failure: 'Auth ✗',
  session_start: 'Session ↑',
  session_stop: 'Session ↓',
  nas_event: 'NAS',
  alert: 'Alert ⚠',
}

const TYPE_CONFIG: Record<string, { color: string; bgClass: string; badgeClass: string }> = {
  auth_success: { color: 'text-emerald-600', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800' },
  auth_failure: { color: 'text-red-600', bgClass: 'bg-red-100 dark:bg-red-900/30', badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800' },
  session_start: { color: 'text-teal-600', bgClass: 'bg-teal-100 dark:bg-teal-900/30', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-800' },
  session_stop: { color: 'text-slate-500', bgClass: 'bg-slate-100 dark:bg-slate-900/30', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800' },
  nas_event: { color: 'text-violet-600', bgClass: 'bg-violet-100 dark:bg-violet-900/30', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800' },
  alert: { color: 'text-amber-600', bgClass: 'bg-amber-100 dark:bg-amber-900/30', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800' },
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const diffMs = now - new Date(timestamp).getTime()
  const diffS = Math.floor(diffMs / 1000)
  if (diffS < 5) return 'Just now'
  if (diffS < 60) return `${diffS}s ago`
  const diffM = Math.floor(diffS / 60)
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

// ==========================================
// Main Component
// ==========================================

export function LiveRadiusEventsPanel() {
  const [events, setEvents] = useState<RadiusEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [maxEvents, setMaxEvents] = useState(50)
  const wsRef = useRef<WebSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldProcessRef = useRef(true)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      try { wsRef.current.close() } catch {}
    }

    try {
      const ws = new WebSocket('/?XTransformPort=3003')
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        shouldProcessRef.current = true
      }

      ws.onmessage = (e) => {
        if (paused || !shouldProcessRef.current) return
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'radius_event' && msg.event) {
            setEvents((prev) => [msg.event, ...prev].slice(0, maxEvents))
          }
        } catch {}
      }

      ws.onclose = () => {
        setConnected(false)
        // Reconnect after 3s
        if (shouldProcessRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), 3000)
        }
      }

      ws.onerror = () => {
        setConnected(false)
      }
    } catch {}
  }, [paused, maxEvents])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      shouldProcessRef.current = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
      }
    }
  }, [connect])

  const handleClear = () => setEvents([])

  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {})

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              connected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
            )}>
              <Radio className={cn('h-4 w-4', connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Live RADIUS Events
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  connected ? 'bg-emerald-500 status-pulse' : 'bg-red-500'
                )} />
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {connected ? 'Connected to event stream' : 'Disconnected — reconnecting...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 px-2 text-[10px]', paused ? 'text-amber-600' : 'text-muted-foreground')}
              onClick={() => setPaused((p) => !p)}
              title={paused ? 'Resume' : 'Pause'}
            >
              {paused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const count = counts[type] || 0
            if (count === 0) return null
            return (
              <Badge key={type} variant="outline" className={cn('text-[9px] px-1.5 py-0', config.badgeClass)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', config.color)} />
                {TYPE_LABELS[type] || type} ({count})
              </Badge>
            )
          })}
        </div>

        {/* Event list */}
        <ScrollArea className="h-[300px]" ref={scrollRef}>
          <div className="space-y-1.5 pr-2">
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {connected ? 'Waiting for events...' : 'Connecting to event stream...'}
                </p>
              </div>
            )}
            {events.map((event) => {
              const sevConfig = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.info
              const typeConf = TYPE_CONFIG[event.type] || TYPE_CONFIG.nas_event
              const SevIcon = sevConfig.icon
              const time = formatTimeAgo(event.timestamp)

              return (
                <div
                  key={event.id}
                  className={cn(
                    'group flex items-start gap-2.5 rounded-lg border p-2 transition-all duration-200',
                    sevConfig.borderClass,
                    'bg-muted/20 hover:bg-muted/30',
                    event === events[0] && 'animate-fade-in-up'
                  )}
                >
                  {/* Severity icon */}
                  <div className={cn('h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5', sevConfig.bgClass)}>
                    <SevIcon className={cn('h-3 w-3', sevConfig.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="outline" className={cn('text-[8px] px-1 py-0 font-mono', typeConf.badgeClass)}>
                        {TYPE_LABELS[event.type] || event.type}
                      </Badge>
                      {event.data?.user && (
                        <span className="text-[10px] font-medium text-foreground truncate">
                          {event.data.user}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {event.message}
                    </p>
                  </div>

                  {/* Time */}
                  <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap shrink-0 mt-0.5">
                    {time}
                  </span>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground/50">
          <span className="flex items-center gap-1">
            {connected ? (
              <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '2s' }} />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
            )}
            {connected ? 'Streaming live events' : 'Reconnecting...'}
          </span>
          <span>{events.length} events (max {maxEvents})</span>
        </div>
      </CardContent>
    </Card>
  )
}
