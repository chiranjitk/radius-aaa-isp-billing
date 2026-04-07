'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Radio,
  Router,
  Wifi,
  MonitorSmartphone,
  Zap,
  Server,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  activeSessions: number
  lastAlive: string | null
}

// ==========================================
// Constants
// ==========================================

const VENDOR_CONFIG: Record<string, {
  color: string
  bgClass: string
  borderClass: string
  badgeClass: string
  lineColor: string
  icon: React.ElementType
}> = {
  cisco: {
    color: '#3b82f6',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30 hover:border-blue-500/60',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
    lineColor: '#3b82f6',
    icon: Router,
  },
  juniper: {
    color: '#10b981',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30 hover:border-emerald-500/60',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    lineColor: '#10b981',
    icon: Radio,
  },
  mikrotik: {
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30 hover:border-amber-500/60',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    lineColor: '#f59e0b',
    icon: Wifi,
  },
  huawei: {
    color: '#ef4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30 hover:border-red-500/60',
    badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
    lineColor: '#ef4444',
    icon: MonitorSmartphone,
  },
  aruba: {
    color: '#8b5cf6',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/30 hover:border-violet-500/60',
    badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25',
    lineColor: '#8b5cf6',
    icon: Zap,
  },
}

const DEFAULT_VENDOR = {
  color: '#6b7280',
  bgClass: 'bg-zinc-500/10',
  borderClass: 'border-zinc-500/30 hover:border-zinc-500/60',
  badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
  lineColor: '#6b7280',
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
// Helper: Calculate node positions in a circle
// ==========================================

interface NodePosition {
  x: number
  y: number
  angle: number
}

function calculateCircularPositions(count: number, centerX: number, centerY: number, radius: number): NodePosition[] {
  const positions: NodePosition[] = []
  // Start from top (-90deg) and go clockwise
  const startAngle = -90
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (360 / count) * i
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
// NAS Node Component
// ==========================================

function NasNode({
  device,
  position,
  isHighlighted,
  onHover,
  onLeave,
}: {
  device: NasDevice
  position: NodePosition
  isHighlighted: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const vendorKey = device.nasType || 'other'
  const config = VENDOR_CONFIG[vendorKey] || DEFAULT_VENDOR
  const VendorIcon = config.icon
  const isOnline = device.status === 'up'

  // Adjust text-anchor based on position around circle
  const isLeft = position.angle > 90 && position.angle < 270
  const isTop = position.angle > -180 && position.angle < 0

  return (
    <g
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="cursor-pointer"
    >
      {/* Glow effect on highlight */}
      {isHighlighted && (
        <circle
          cx={position.x}
          cy={position.y}
          r={44}
          fill={config.color}
          opacity={0.08}
        />
      )}

      {/* Node background */}
      <circle
        cx={position.x}
        cy={position.y}
        r={isHighlighted ? 40 : 36}
        fill={isHighlighted ? `${config.color}15` : 'hsl(var(--card))'}
        stroke={isHighlighted ? config.color : 'hsl(var(--border))'}
        strokeWidth={isHighlighted ? 2 : 1}
        className="transition-all duration-300"
        style={{ filter: isHighlighted ? `drop-shadow(0 0 8px ${config.color}40)` : 'none' }}
      />

      {/* Status indicator ring */}
      <circle
        cx={position.x}
        cy={position.y}
        r={36}
        fill="none"
        stroke={isOnline ? '#10b981' : '#ef4444'}
        strokeWidth={2}
        strokeDasharray={isHighlighted ? 'none' : '4 4'}
        className="transition-all duration-300"
        opacity={isHighlighted ? 0.6 : 0.3}
      />

      {/* Icon */}
      <foreignObject
        x={position.x - 12}
        y={position.y - 16}
        width={24}
        height={24}
      >
        <div className="flex items-center justify-center w-full h-full">
          <VendorIcon
            className="h-5 w-5"
            style={{ color: config.color }}
          />
        </div>
      </foreignObject>

      {/* Status dot */}
      <circle
        cx={position.x + 22}
        cy={position.y - 22}
        r={5}
        fill={isOnline ? '#10b981' : '#ef4444'}
        className={isOnline ? 'status-pulse' : ''}
      />
      <circle
        cx={position.x + 22}
        cy={position.y - 22}
        r={5}
        fill="none"
        stroke="hsl(var(--card))"
        strokeWidth={2}
      />

      {/* Device name label */}
      <text
        x={position.x}
        y={position.y + 54}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-semibold select-none"
        style={{ pointerEvents: 'none' }}
      >
        {device.nasName.length > 16 ? device.nasName.slice(0, 15) + '...' : device.nasName}
      </text>

      {/* IP label */}
      <text
        x={position.x}
        y={position.y + 67}
        textAnchor="middle"
        className="fill-muted-foreground text-[9px] font-mono select-none"
        style={{ pointerEvents: 'none' }}
      >
        {device.ipAddress}
      </text>
    </g>
  )
}

// ==========================================
// Connection Line Component
// ==========================================

function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  color,
  isHighlighted,
  isOnline,
}: {
  fromX: number
  fromY: number
  toX: number
  toY: number
  color: string
  isHighlighted: boolean
  isOnline: boolean
}) {
  return (
    <line
      x1={fromX}
      y1={fromY}
      x2={toX}
      y2={toY}
      stroke={isHighlighted ? color : isOnline ? '#10b98140' : '#ef444440'}
      strokeWidth={isHighlighted ? 2.5 : 1.5}
      strokeDasharray={isHighlighted ? 'none' : '6 4'}
      className="transition-all duration-300"
      style={
        isHighlighted
          ? {}
          : {
              animation: 'dashMove 2s linear infinite',
              strokeDashoffset: '0',
            }
      }
    />
  )
}

// ==========================================
// Tooltip Component
// ==========================================

function TopologyTooltip({
  device,
  position,
}: {
  device: NasDevice
  position: NodePosition
}) {
  const vendorKey = device.nasType || 'other'
  const config = VENDOR_CONFIG[vendorKey] || DEFAULT_VENDOR
  const isOnline = device.status === 'up'

  // Position tooltip based on node position
  const isLeft = position.angle > 90 && position.angle < 270
  const tooltipX = isLeft ? position.x - 190 : position.x + 50
  const tooltipY = position.y - 40

  return (
    <foreignObject
      x={tooltipX}
      y={tooltipY}
      width={200}
      height={140}
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
        <div className="space-y-1 text-[10px]">
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
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={isOnline ? 'text-emerald-600' : 'text-red-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sessions</span>
            <span className="font-semibold">{device.activeSessions}</span>
          </div>
        </div>
      </div>
    </foreignObject>
  )
}

// ==========================================
// Loading Skeleton
// ==========================================

function TopologySkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Skeleton className="h-48 w-48 rounded-full" />
      <div className="space-y-2 text-center">
        <Skeleton className="h-5 w-40 mx-auto" />
        <Skeleton className="h-3 w-32 mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// Legend Component
// ==========================================

function TopologyLegend({ devices }: { devices: NasDevice[] }) {
  const vendorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of devices) {
      const key = d.nasType || 'other'
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [devices])

  const onlineCount = devices.filter(d => d.status === 'up').length

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4 px-2">
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {onlineCount} Online
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {devices.length - onlineCount} Offline
        </span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(vendorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => {
            const config = VENDOR_CONFIG[type] || DEFAULT_VENDOR
            return (
              <span
                key={type}
                className="flex items-center gap-1 text-[10px]"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-muted-foreground">
                  {VENDOR_LABELS[type] || type}
                </span>
                <span className="font-semibold text-foreground">{count}</span>
              </span>
            )
          })}
      </div>
    </div>
  )
}

// ==========================================
// Main Component
// ==========================================

export function NetworkTopology() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Fetch all NAS devices (page 1, limit 100 to get all)
  const { data, isLoading } = useQuery<{
    devices: NasDevice[]
    stats: { total: number; online: number; offline: number; totalActiveSessions: number }
  }>({
    queryKey: ['nas-topology-all'],
    queryFn: async () => {
      const res = await fetch('/api/nas?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    staleTime: 30000,
  })

  const devices = data?.devices || []

  // SVG dimensions
  const svgWidth = 700
  const svgHeight = 520
  const centerX = svgWidth / 2
  const centerY = svgHeight / 2 - 20
  const radius = 185

  const positions = useMemo(
    () => calculateCircularPositions(devices.length, centerX, centerY, radius),
    [devices.length, centerX, centerY, radius]
  )

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <TopologySkeleton />
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-12 text-center">
        <Server className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No NAS devices to display</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Add NAS devices to see the network topology</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-2 md:p-4 animate-fade-in-up">
      {/* SVG Topology Map */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[400px] max-h-[520px]"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))' }}
        >
          {/* Animated dash keyframes */}
          <style>{`
            @keyframes dashMove {
              to { stroke-dashoffset: -20; }
            }
          `}</style>

          {/* Background grid pattern */}
          <defs>
            <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="0.5" fill="hsl(var(--muted-foreground) / 0.15)" />
            </pattern>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background dots */}
          <rect width={svgWidth} height={svgHeight} fill="url(#topo-grid)" />

          {/* Center glow */}
          <circle cx={centerX} cy={centerY} r={radius + 40} fill="url(#center-glow)" />

          {/* Connection lines */}
          {devices.map((device, i) => {
            const pos = positions[i]
            if (!pos) return null
            const vendorKey = device.nasType || 'other'
            const config = VENDOR_CONFIG[vendorKey] || DEFAULT_VENDOR
            const isHighlighted = hoveredId === device.id

            return (
              <ConnectionLine
                key={device.id}
                fromX={centerX}
                fromY={centerY}
                toX={pos.x}
                toY={pos.y}
                color={config.color}
                isHighlighted={isHighlighted}
                isOnline={device.status === 'up'}
              />
            )
          })}

          {/* Central FreeRADIUS Server node */}
          <g>
            {/* Outer glow ring */}
            <circle
              cx={centerX}
              cy={centerY}
              r={52}
              fill="#10b98108"
              stroke="#10b98120"
              strokeWidth={1}
              strokeDasharray="4 4"
              className="animate-[spin_30s_linear_infinite]"
              style={{ transformOrigin: `${centerX}px ${centerY}px` }}
            />

            {/* Server background */}
            <circle
              cx={centerX}
              cy={centerY}
              r={42}
              fill="hsl(var(--card))"
              stroke="#10b981"
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.2))' }}
            />

            {/* Server icon */}
            <foreignObject x={centerX - 14} y={centerY - 18} width={28} height={28}>
              <div className="flex items-center justify-center w-full h-full">
                <Radio className="h-6 w-6 text-emerald-500" />
              </div>
            </foreignObject>

            {/* Server label */}
            <text
              x={centerX}
              y={centerY + 20}
              textAnchor="middle"
              className="fill-emerald-600 dark:fill-emerald-400 text-[8px] font-bold uppercase tracking-wider select-none"
              style={{ pointerEvents: 'none' }}
            >
              FreeRADIUS
            </text>

            {/* Online indicator */}
            <circle cx={centerX + 30} cy={centerY - 30} r={5} fill="#10b981" className="status-pulse" />
            <circle cx={centerX + 30} cy={centerY - 30} r={5} fill="none" stroke="hsl(var(--card))" strokeWidth={2} />

            {/* Server title below */}
            <text
              x={centerX}
              y={centerY + 62}
              textAnchor="middle"
              className="fill-foreground text-[12px] font-bold select-none"
              style={{ pointerEvents: 'none' }}
            >
              RADIUS Server
            </text>
            <text
              x={centerX}
              y={centerY + 76}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px] font-mono select-none"
              style={{ pointerEvents: 'none' }}
            >
              10.0.1.254:1812
            </text>
          </g>

          {/* NAS Device Nodes */}
          {devices.map((device, i) => {
            const pos = positions[i]
            if (!pos) return null
            return (
              <NasNode
                key={device.id}
                device={device}
                position={pos}
                isHighlighted={hoveredId === device.id}
                onHover={() => setHoveredId(device.id)}
                onLeave={() => setHoveredId(null)}
              />
            )
          })}

          {/* Tooltip for hovered node */}
          {hoveredId &&
            devices.map((device, i) => {
              if (device.id !== hoveredId) return null
              const pos = positions[i]
              if (!pos) return null
              return (
                <TopologyTooltip
                  key={`tooltip-${device.id}`}
                  device={device}
                  position={pos}
                />
              )
            })}
        </svg>
      </div>

      {/* Legend */}
      <TopologyLegend devices={devices} />

      {/* Vendor badges */}
      <div className="flex flex-wrap gap-1.5 mt-3 px-2 pb-1">
        {Object.entries(
          devices.reduce<Record<string, NasDevice[]>>((acc, d) => {
            const key = d.nasType || 'other'
            if (!acc[key]) acc[key] = []
            acc[key].push(d)
            return acc
          }, {})
        ).map(([type, devs]) => {
          const config = VENDOR_CONFIG[type] || DEFAULT_VENDOR
          return (
            <Badge
              key={type}
              variant="outline"
              className={cn('text-[10px] gap-1 font-medium', config.badgeClass)}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {VENDOR_LABELS[type] || type} ({devs.length})
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
