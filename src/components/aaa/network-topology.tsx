'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Radio,
  Router,
  Wifi,
  MonitorSmartphone,
  Zap,
  Server,
  Globe,
  UserCircle,
  Activity,
  ArrowUpDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ==========================================
// Types
// ==========================================

interface NasDevice {
  id: string
  nasName: string
  shortName: string | null
  nasType: string
  ipAddress: string
  status: string
  vendor: string | null
  model: string | null
  ports: number | null
  location: string | null
  activeSessions: number
  lastAlive: string | null
}

interface SessionRecord {
  id: string
  sessionId: string
  username: string | null
  nasIpAddress: string | null
  framedIpAddress: string | null
  status: string
  acctInputOctets: number
  acctOutputOctets: number
  nas?: {
    id: string
    nasName: string
    ipAddress: string
  } | null
}

interface TopologyStats {
  totalNas: number
  onlineNas: number
  activeSessions: number
  totalConnectedUsers: number
  totalBandwidth: number
  topNasByConnections: { name: string; count: number }[]
}

// ==========================================
// Constants
// ==========================================

const VENDOR_CONFIG: Record<string, {
  color: string
  bgClass: string
  borderClass: string
  badgeClass: string
  icon: React.ElementType
}> = {
  cisco: {
    color: '#475569',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/30 hover:border-slate-500/60',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25',
    icon: Router,
  },
  juniper: {
    color: '#f43f5e',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30 hover:border-rose-500/60',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
    icon: Radio,
  },
  mikrotik: {
    color: '#14b8a6',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500/30 hover:border-teal-500/60',
    badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25',
    icon: Wifi,
  },
  huawei: {
    color: '#ef4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30 hover:border-red-500/60',
    badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
    icon: MonitorSmartphone,
  },
  aruba: {
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30 hover:border-amber-500/60',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    icon: Zap,
  },
}

const DEFAULT_VENDOR = {
  color: '#6b7280',
  bgClass: 'bg-zinc-500/10',
  borderClass: 'border-zinc-500/30 hover:border-zinc-500/60',
  badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
  icon: Server,
}

const VENDOR_LABELS: Record<string, string> = {
  cisco: 'Cisco',
  juniper: 'Juniper',
  mikrotik: 'MikroTik',
  huawei: 'Huawei',
  aruba: 'Aruba',
  other: 'Other',
}

// ==========================================
// Helpers
// ==========================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

interface NodePosition {
  x: number
  y: number
  angle: number
}

function calculateSemiCirclePositions(count: number, centerX: number, centerY: number, radius: number): NodePosition[] {
  if (count === 0) return []
  const positions: NodePosition[] = []
  const startAngle = -150
  const endAngle = -30
  const step = count === 1 ? 0 : (endAngle - startAngle) / (count - 1)
  for (let i = 0; i < count; i++) {
    const angle = startAngle + step * i
    const rad = (angle * Math.PI) / 180
    positions.push({
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
      angle,
    })
  }
  return positions
}

// ==========================================
// Loading Skeleton
// ==========================================

function TopologySkeleton() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[520px] rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}

// ==========================================
// Stat Card
// ==========================================

function StatCard({ icon: Icon, label, value, sub, color, delay }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  delay: number
}) {
  return (
    <Card className={cn('animate-fade-in-up card-shine hover-lift border-border/50', `stagger-${delay + 1}`)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
          <p className="text-lg font-bold tabular-nums mt-1 leading-none" style={{ color }}>{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// SVG Topology Map Component
// ==========================================

function TopologyMap({
  devices,
  sessions,
  hoveredId,
  onHoverNode,
  onLeaveNode,
}: {
  devices: NasDevice[]
  sessions: SessionRecord[]
  hoveredId: string | null
  onHoverNode: (id: string | null) => void
  onLeaveNode: () => void
}) {
  const svgWidth = 800
  const svgHeight = 540
  const centerX = svgWidth / 2
  const centerY = svgHeight / 2 + 20
  const nasRadius = 200

  const displayDevices = useMemo(() => {
    const sorted = [...devices].sort((a, b) => {
      if (a.status === 'up' && b.status !== 'up') return -1
      if (a.status !== 'up' && b.status === 'up') return 1
      return (b.activeSessions || 0) - (a.activeSessions || 0)
    })
    return sorted.slice(0, 6)
  }, [devices])

  const positions = useMemo(
    () => calculateSemiCirclePositions(displayDevices.length, centerX, centerY, nasRadius),
    [displayDevices.length, centerX, centerY, nasRadius]
  )

  const sessionsByNas = useMemo(() => {
    const map: Record<string, SessionRecord[]> = {}
    for (const s of sessions) {
      const ip = s.nasIpAddress || s.nas?.ipAddress
      if (ip) {
        if (!map[ip]) map[ip] = []
        map[ip].push(s)
      }
    }
    return map
  }, [sessions])

  // Calculate client node positions around each NAS
  const clientPositions = useMemo(() => {
    const result: { sessionId: string; username: string | null; x: number; y: number; status: string; parentX: number; parentY: number }[] = []
    const clientRadius = 38

    displayDevices.forEach((device, i) => {
      const pos = positions[i]
      if (!pos) return
      const deviceSessions = sessionsByNas[device.ipAddress] || []
      const activeSessions = deviceSessions.filter(s => s.status === 'active').slice(0, 5)

      if (activeSessions.length === 0) return

      const spreadAngle = deviceSessions.length === 1 ? 0 : Math.min(90, activeSessions.length * 20)
      const startAng = pos.angle - spreadAngle / 2

      activeSessions.forEach((session, j) => {
        const ang = activeSessions.length === 1
          ? pos.angle
          : startAng + (spreadAngle / Math.max(activeSessions.length - 1, 1)) * j
        const rad = (ang * Math.PI) / 180
        result.push({
          sessionId: session.sessionId,
          username: session.username,
          x: pos.x + clientRadius * Math.cos(rad),
          y: pos.y + clientRadius * Math.sin(rad),
          status: session.status,
          parentX: pos.x,
          parentY: pos.y,
        })
      })
    })

    return result
  }, [displayDevices, positions, sessionsByNas])

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 animate-fade-in-up stagger-2">
      {/* Topology header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold">Network Topology Map</span>
        </div>
        <Badge variant="outline" className="text-[9px] font-mono px-2 h-5 rounded-full border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-pulse mr-1" />
          Live
        </Badge>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto px-2 pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[500px]"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.04))' }}
        >
          {/* Animations */}
          <style>{`
            @keyframes dashFlow {
              to { stroke-dashoffset: -24; }
            }
            @keyframes trafficDot {
              0% { offset-distance: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { offset-distance: 100%; opacity: 0; }
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.15; transform: scale(1); }
              50% { opacity: 0.35; transform: scale(1.08); }
            }
            @keyframes centerPulse {
              0%, 100% { r: 46; opacity: 0.08; }
              50% { r: 54; opacity: 0.02; }
            }
            .topo-dash { animation: dashFlow 1.5s linear infinite; }
            .topo-dash-slow { animation: dashFlow 3s linear infinite; }
            .topo-traffic {
              animation: trafficDot 2.5s linear infinite;
            }
            .topo-pulse-glow {
              animation: pulseGlow 3s ease-in-out infinite;
              transform-origin: center;
            }
          `}</style>

          {/* Background grid */}
          <defs>
            <pattern id="topo-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.4" className="fill-muted-foreground" opacity="0.12" />
            </pattern>
            <radialGradient id="center-glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <filter id="node-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={svgWidth} height={svgHeight} fill="url(#topo-dots)" />
          <circle cx={centerX} cy={centerY} r={nasRadius + 60} fill="url(#center-glow-grad)" />

          {/* ===== Connection lines: Center to NAS ===== */}
          {displayDevices.map((device, i) => {
            const pos = positions[i]
            if (!pos) return null
            const isOnline = device.status === 'up'
            const isHighlighted = hoveredId === device.id
            const vendorKey = (device.vendor || device.nasType || 'other').toLowerCase()
            const config = VENDOR_CONFIG[vendorKey] || DEFAULT_VENDOR

            return (
              <g key={`line-${device.id}`}>
                {/* Background glow line */}
                {isOnline && (
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={pos.x}
                    y2={pos.y}
                    stroke={config.color}
                    strokeWidth={isHighlighted ? 6 : 3}
                    opacity={isHighlighted ? 0.15 : 0.05}
                    className="transition-all duration-300"
                  />
                )}
                {/* Main dashed line */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={isHighlighted ? config.color : isOnline ? '#10b981' : '#6b7280'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray={isHighlighted ? 'none' : isOnline ? '8 6' : '4 4'}
                  opacity={isHighlighted ? 1 : isOnline ? 0.5 : 0.25}
                  className={isHighlighted ? 'transition-all duration-300' : isOnline ? 'topo-dash' : 'topo-dash-slow'}
                />
                {/* Traffic flow dot on active connections */}
                {isOnline && device.activeSessions > 0 && (
                  <circle r={isHighlighted ? 3 : 2} fill={config.color} opacity={0.8}>
                    <animateMotion
                      dur={`${2 + i * 0.3}s`}
                      repeatCount="indefinite"
                      path={`M${centerX},${centerY} L${pos.x},${pos.y}`}
                    />
                  </circle>
                )}
              </g>
            )
          })}

          {/* ===== Connection lines: NAS to Clients ===== */}
          {clientPositions.map((client) => {
            const isActive = client.status === 'active'
            return (
              <line
                key={`client-line-${client.sessionId}`}
                x1={client.parentX}
                y1={client.parentY}
                x2={client.x}
                y2={client.y}
                stroke={isActive ? '#10b981' : '#6b7280'}
                strokeWidth={0.8}
                strokeDasharray="3 3"
                opacity={isActive ? 0.4 : 0.15}
                className={isActive ? 'topo-dash' : ''}
              />
            )
          })}

          {/* ===== Central FreeRADIUS Server ===== */}
          <g>
            {/* Pulse ring */}
            <circle
              cx={centerX}
              cy={centerY}
              r={48}
              fill="none"
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="3 5"
              opacity={0.2}
              className="topo-dash"
            />

            {/* Animated glow */}
            <circle
              cx={centerX}
              cy={centerY}
              r={52}
              fill="#10b981"
              opacity={0.08}
              className="topo-pulse-glow"
            />

            {/* Server background */}
            <circle
              cx={centerX}
              cy={centerY}
              r={42}
              fill="hsl(var(--card))"
              stroke="#10b981"
              strokeWidth={2.5}
              style={{ filter: 'drop-shadow(0 0 16px rgba(16, 185, 129, 0.2))' }}
            />

            {/* Inner gradient ring */}
            <circle
              cx={centerX}
              cy={centerY}
              r={38}
              fill="none"
              stroke="url(#center-ring-gradient)"
              strokeWidth={1}
              opacity={0.3}
            />
            <defs>
              <linearGradient id="center-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Server icon */}
            <foreignObject x={centerX - 14} y={centerY - 18} width={28} height={28}>
              <div className="flex items-center justify-center w-full h-full">
                <Radio className="h-6 w-6 text-emerald-500" />
              </div>
            </foreignObject>

            {/* Status dot */}
            <circle cx={centerX + 30} cy={centerY - 30} r={5} fill="#10b981" className="status-pulse" />
            <circle cx={centerX + 30} cy={centerY - 30} r={5} fill="none" stroke="hsl(var(--card))" strokeWidth={2} />

            {/* Labels */}
            <text
              x={centerX}
              y={centerY + 16}
              textAnchor="middle"
              className="fill-emerald-600 dark:fill-emerald-400 text-[8px] font-bold uppercase tracking-widest select-none"
              style={{ pointerEvents: 'none' }}
            >
              FreeRADIUS
            </text>

            <text
              x={centerX}
              y={centerY + 62}
              textAnchor="middle"
              className="fill-foreground text-[13px] font-bold select-none breathe"
              style={{ pointerEvents: 'none' }}
            >
              RADIUS Server
            </text>
            <text
              x={centerX}
              y={centerY + 77}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px] font-mono select-none"
              style={{ pointerEvents: 'none' }}
            >
              FreeRADIUS 3.2.5
            </text>
          </g>

          {/* ===== NAS Device Nodes ===== */}
          {displayDevices.map((device, i) => {
            const pos = positions[i]
            if (!pos) return null
            const vendorKey = (device.vendor || device.nasType || 'other').toLowerCase()
            const config = VENDOR_CONFIG[vendorKey] || DEFAULT_VENDOR
            const VendorIcon = config.icon
            const isOnline = device.status === 'up'
            const isHighlighted = hoveredId === device.id
            const deviceSessions = sessionsByNas[device.ipAddress] || []

            return (
              <g
                key={device.id}
                onMouseEnter={() => onHoverNode(device.id)}
                onMouseLeave={onLeaveNode}
                className="cursor-pointer"
              >
                {/* Highlight glow */}
                {isHighlighted && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={46}
                    fill={config.color}
                    opacity={0.06}
                    className="transition-all duration-300"
                  />
                )}

                {/* Node background */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHighlighted ? 38 : 34}
                  fill={isHighlighted ? `${config.color}10` : 'hsl(var(--card))'}
                  stroke={isHighlighted ? config.color : isOnline ? `${config.color}60` : '#6b728040'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  className="transition-all duration-300"
                  style={
                    isHighlighted
                      ? { filter: `drop-shadow(0 0 10px ${config.color}30)` }
                      : isOnline
                        ? { filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.05))' }
                        : undefined
                  }
                />

                {/* Status ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={34}
                  fill="none"
                  stroke={isOnline ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  strokeDasharray={isHighlighted ? 'none' : '4 4'}
                  opacity={isHighlighted ? 0.6 : 0.2}
                  className={isHighlighted ? 'transition-all duration-300' : isOnline ? 'topo-dash-slow' : ''}
                />

                {/* Icon */}
                <foreignObject x={pos.x - 12} y={pos.y - 14} width={24} height={24}>
                  <div className="flex items-center justify-center w-full h-full">
                    <VendorIcon className="h-5 w-5" style={{ color: config.color }} />
                  </div>
                </foreignObject>

                {/* Status indicator */}
                <circle
                  cx={pos.x + 22}
                  cy={pos.y - 22}
                  r={5}
                  fill={isOnline ? '#10b981' : '#ef4444'}
                  className={isOnline ? 'status-pulse' : ''}
                />
                <circle
                  cx={pos.x + 22}
                  cy={pos.y - 22}
                  r={5}
                  fill="none"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />

                {/* Session count badge */}
                {device.activeSessions > 0 && (
                  <foreignObject x={pos.x - 12} y={pos.y + 20} width={24} height={16}>
                    <div className="flex items-center justify-center">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                        style={{
                          backgroundColor: `${config.color}20`,
                          color: config.color,
                        }}
                      >
                        {device.activeSessions}
                      </span>
                    </div>
                  </foreignObject>
                )}

                {/* Device name */}
                <text
                  x={pos.x}
                  y={pos.y + 50}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-semibold select-none"
                  style={{ pointerEvents: 'none' }}
                >
                  {device.nasName.length > 18 ? device.nasName.slice(0, 17) + '...' : device.nasName}
                </text>

                {/* IP address */}
                <text
                  x={pos.x}
                  y={pos.y + 63}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px] font-mono select-none"
                  style={{ pointerEvents: 'none' }}
                >
                  {device.ipAddress}
                </text>

                {/* ===== Hover Tooltip ===== */}
                {isHighlighted && (
                  <foreignObject
                    x={pos.x + 48}
                    y={pos.y - 80}
                    width={210}
                    height={180}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className="rounded-lg border shadow-xl p-3 bg-background/95 backdrop-blur-sm text-foreground">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: isOnline ? '#10b981' : '#ef4444' }}
                        />
                        <span className="text-xs font-bold truncate">{device.nasName}</span>
                      </div>
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IP Address</span>
                          <span className="font-mono">{device.ipAddress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vendor</span>
                          <span style={{ color: config.color }}>{VENDOR_LABELS[vendorKey] || vendorKey}</span>
                        </div>
                        {device.model && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model</span>
                            <span className="font-medium">{device.model}</span>
                          </div>
                        )}
                        {device.ports != null && device.ports > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ports</span>
                            <span className="font-medium">{device.ports}</span>
                          </div>
                        )}
                        {device.location && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location</span>
                            <span className="font-medium truncate ml-2">{device.location}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className={isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                            {isOnline ? 'Online' : device.status === 'down' ? 'Offline' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Active Sessions</span>
                          <span className="font-bold">{device.activeSessions}</span>
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                )}
              </g>
            )
          })}

          {/* ===== Client Nodes ===== */}
          {clientPositions.map((client) => {
            const isActive = client.status === 'active'
            return (
              <g key={`client-${client.sessionId}`}>
                <circle
                  cx={client.x}
                  cy={client.y}
                  r={5}
                  fill={isActive ? '#10b981' : '#6b7280'}
                  opacity={isActive ? 0.8 : 0.3}
                  className={isActive ? 'status-pulse' : ''}
                />
                {isActive && (
                  <circle
                    cx={client.x}
                    cy={client.y}
                    r={5}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={0.5}
                    opacity={0.3}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-4 pb-3 border-t border-border/30 pt-2">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Offline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Disabled
          </span>
          <span className="h-px w-3 bg-emerald-500/50 border-t border-dashed border-emerald-500" />
          Active
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(
            displayDevices.reduce<Record<string, number>>((acc, d) => {
              const key = (d.vendor || d.nasType || 'other').toLowerCase()
              acc[key] = (acc[key] || 0) + 1
              return acc
            }, {})
          )
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const config = VENDOR_CONFIG[type] || DEFAULT_VENDOR
              return (
                <span key={type} className="flex items-center gap-1 text-[10px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="text-muted-foreground">{VENDOR_LABELS[type] || type}</span>
                  <span className="font-semibold text-foreground">{count}</span>
                </span>
              )
            })}
        </div>
        {clientPositions.length > 0 && (
          <>
            <div className="h-3 w-px bg-border" />
            <span className="text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block mr-1 align-middle" />
              {clientPositions.filter(c => c.status === 'active').length} client sessions shown
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ==========================================
// Info Panel
// ==========================================

function InfoPanel({ stats }: { stats: TopologyStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in-up stagger-4">
      {/* Left: Top NAS by connections */}
      <Card className="card-shine hover-lift border-border/50 card-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-semibold">Top NAS by Connections</h3>
          </div>
          <div className="space-y-2">
            {stats.topNasByConnections.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No active connections</p>
            ) : (
              stats.topNasByConnections.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium truncate">{item.name}</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-2 tabular-nums">{item.count}</span>
                    </div>
                    <div className="data-bar mt-1">
                      <div
                        className="data-bar-fill"
                        style={{
                          width: `${stats.topNasByConnections[0] ? (item.count / stats.topNasByConnections[0].count) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right: Network Summary */}
      <Card className="card-shine hover-lift border-border/50 card-glow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpDown className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-semibold">Bandwidth Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Traffic</p>
              <p className="text-sm font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
                {formatBytes(stats.totalBandwidth)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Users</p>
              <p className="text-sm font-bold tabular-nums mt-1 text-amber-600 dark:text-amber-400">
                {stats.totalConnectedUsers}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">NAS Online</p>
              <p className="text-sm font-bold tabular-nums mt-1">
                <span className="text-emerald-600 dark:text-emerald-400">{stats.onlineNas}</span>
                <span className="text-muted-foreground">/{stats.totalNas}</span>
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Sessions</p>
              <p className="text-sm font-bold tabular-nums mt-1 text-foreground">
                {stats.activeSessions}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==========================================
// Mobile List View
// ==========================================

function MobileListView({ devices, sessions }: { devices: NasDevice[]; sessions: SessionRecord[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sessionsByNas = useMemo(() => {
    const map: Record<string, SessionRecord[]> = {}
    for (const s of sessions) {
      const ip = s.nasIpAddress || s.nas?.ipAddress
      if (ip) {
        if (!map[ip]) map[ip] = []
        map[ip].push(s)
      }
    }
    return map
  }, [sessions])

  return (
    <div className="space-y-2">
      {/* Central Server Card */}
      <Card className="border-emerald-200/50 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/20">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
            <Radio className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">FreeRADIUS 3.2.5</p>
            <p className="text-[10px] text-muted-foreground">Central Authentication Server</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 status-pulse shrink-0" />
        </CardContent>
      </Card>

      {/* Connection indicator */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <div className="h-px flex-1 bg-emerald-500/30 border-t border-dashed border-emerald-500/40" />
        <span className="text-[9px] font-medium uppercase tracking-wider">RADIUS Connections</span>
        <div className="h-px flex-1 bg-emerald-500/30 border-t border-dashed border-emerald-500/40" />
      </div>

      {/* NAS Device Cards */}
      {devices.map((device) => {
        const vendorKey = (device.vendor || device.nasType || 'other').toLowerCase()
        const config = VENDOR_CONFIG[vendorKey] || DEFAULT_VENDOR
        const VendorIcon = config.icon
        const isOnline = device.status === 'up'
        const deviceSessions = sessionsByNas[device.ipAddress] || []
        const isExpanded = expandedId === device.id

        return (
          <Card
            key={device.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover-lift',
              isOnline ? 'border-border/50' : 'border-red-200/30 dark:border-red-800/20'
            )}
            onClick={() => setExpandedId(isExpanded ? null : device.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <VendorIcon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold truncate">{device.nasName}</span>
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isOnline ? '#10b981' : '#ef4444' }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">{device.ipAddress}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: config.color }}>
                    {device.activeSessions}
                  </span>
                  <p className="text-[9px] text-muted-foreground">sessions</p>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">Vendor</span>
                      <p className="font-medium" style={{ color: config.color }}>
                        {VENDOR_LABELS[vendorKey] || vendorKey}
                      </p>
                    </div>
                    {device.model && (
                      <div>
                        <span className="text-muted-foreground">Model</span>
                        <p className="font-medium">{device.model}</p>
                      </div>
                    )}
                    {device.location && (
                      <div>
                        <span className="text-muted-foreground">Location</span>
                        <p className="font-medium truncate">{device.location}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <p className={isOnline ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-red-600 dark:text-red-400'}>
                        {isOnline ? 'Online' : device.status === 'down' ? 'Offline' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  {deviceSessions.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Active Sessions</p>
                      <div className="flex flex-wrap gap-1">
                        {deviceSessions
                          .filter(s => s.status === 'active')
                          .slice(0, 8)
                          .map((s) => (
                            <span
                              key={s.sessionId}
                              className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full"
                            >
                              <UserCircle className="h-2.5 w-2.5" />
                              {s.username || s.sessionId.slice(0, 8)}
                            </span>
                          ))}
                        {deviceSessions.filter(s => s.status === 'active').length > 8 && (
                          <span className="text-[9px] text-muted-foreground px-1.5 py-0.5">
                            +{deviceSessions.filter(s => s.status === 'active').length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ==========================================
// Main Component
// ==========================================

export function NetworkTopology() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleHoverNode = useCallback((id: string | null) => {
    setHoveredId(id)
  }, [])

  const handleLeaveNode = useCallback(() => {
    setHoveredId(null)
  }, [])

  const { data: nasData, isLoading: nasLoading } = useQuery<{
    devices: NasDevice[]
    stats: { total: number; online: number; offline: number; totalActiveSessions: number }
  }>({
    queryKey: ['nas-topology'],
    queryFn: async () => {
      const res = await fetch('/api/nas?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 10000,
    staleTime: 10000,
  })

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{
    sessions: SessionRecord[]
    stats: { totalBandwidth: number; activeCount: number }
  }>({
    queryKey: ['sessions-topology'],
    queryFn: async () => {
      const res = await fetch('/api/sessions?limit=100&status=active')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 10000,
    staleTime: 10000,
  })

  const devices = nasData?.devices || []
  const sessions = sessionsData?.sessions || []

  const stats: TopologyStats = useMemo(() => {
    const onlineNas = devices.filter(d => d.status === 'up').length
    const activeSessions = sessions.filter(s => s.status === 'active').length
    const connectedUsers = new Set(sessions.filter(s => s.status === 'active' && s.username).map(s => s.username)).size
    const totalBandwidth = sessions.reduce((sum, s) => sum + (s.acctInputOctets || 0) + (s.acctOutputOctets || 0), 0)

    const nasSessionCounts: Record<string, { name: string; count: number }> = {}
    for (const d of devices) {
      if (d.activeSessions > 0) {
        nasSessionCounts[d.id] = { name: d.nasName, count: d.activeSessions }
      }
    }
    const topNas = Object.values(nasSessionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalNas: devices.length,
      onlineNas,
      activeSessions,
      totalConnectedUsers: connectedUsers,
      totalBandwidth,
      topNasByConnections: topNas,
    }
  }, [devices, sessions])

  if (nasLoading || sessionsLoading) {
    return <TopologySkeleton />
  }

  if (devices.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-12 text-center animate-fade-in-up">
        <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No NAS devices to display</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Add NAS devices to see the network topology</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Server}
          label="NAS Devices"
          value={`${stats.onlineNas}/${stats.totalNas}`}
          sub={`${stats.onlineNas} online`}
          color="#10b981"
          delay={0}
        />
        <StatCard
          icon={Activity}
          label="Active Sessions"
          value={stats.activeSessions}
          sub="real-time"
          color="#f59e0b"
          delay={1}
        />
        <StatCard
          icon={UserCircle}
          label="Connected Users"
          value={stats.totalConnectedUsers}
          sub="unique users"
          color="#f43f5e"
          delay={2}
        />
        <StatCard
          icon={ArrowUpDown}
          label="Bandwidth"
          value={formatBytes(stats.totalBandwidth)}
          sub="total traffic"
          color="#14b8a6"
          delay={3}
        />
      </div>

      {/* Desktop: SVG Topology / Mobile: List View */}
      <div className="hidden md:block">
        <TopologyMap
          devices={devices}
          sessions={sessions}
          hoveredId={hoveredId}
          onHoverNode={handleHoverNode}
          onLeaveNode={handleLeaveNode}
        />
      </div>
      <div className="md:hidden">
        <MobileListView devices={devices} sessions={sessions} />
      </div>

      {/* Info Panel */}
      <InfoPanel stats={stats} />

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60 py-2">
        <span className="h-1 w-1 rounded-full bg-emerald-500 status-pulse" />
        Auto-refreshing every 10 seconds
      </div>
    </div>
  )
}
