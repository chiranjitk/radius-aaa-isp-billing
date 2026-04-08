import { NextResponse } from 'next/server'

// GET /api/system-health — Simulated system health data with slight variance per request

// Base values (will vary slightly per request)
let baseCpu = 23
let baseMemUsed = 6.2
let baseDiskUsed = 187.4
let baseRxTotal = 14_573_200_000
let baseTxTotal = 8_392_100_000
let baseAuthTotal = 847_293
let baseAcctTotal = 1_293_847
let uptimeSeconds = 15 * 86400 + 7 * 3600 + 32 * 60 + 15 // ~15d 7h 32m

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function jitter(base: number, range: number): number {
  return clamp(base + (Math.random() - 0.5) * range, 0, Infinity)
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(2)} KB`
  return `${bytes} B`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

export async function GET() {
  // Advance uptime by 5s (approximate request interval)
  uptimeSeconds += 5

  // CPU
  baseCpu = clamp(baseCpu + (Math.random() - 0.48) * 4, 8, 75)
  const cpuUsage = Math.round(baseCpu * 10) / 10
  const cpuCores = 8
  const cpuTemp = `${Math.round(42 + cpuUsage * 0.4 + (Math.random() - 0.5) * 3)}°C`

  // Memory
  const memTotal = '16.0 GB'
  baseMemUsed = clamp(baseMemUsed + (Math.random() - 0.5) * 0.3, 3.5, 14.5)
  const memUsedStr = `${baseMemUsed.toFixed(1)} GB`
  const memUsage = Math.round((baseMemUsed / 16.0) * 1000) / 10

  // Disk
  const diskTotal = '500.0 GB'
  baseDiskUsed = clamp(baseDiskUsed + Math.random() * 0.02, 180, 490)
  const diskUsedStr = `${baseDiskUsed.toFixed(1)} GB`
  const diskUsage = Math.round((baseDiskUsed / 500.0) * 1000) / 10

  // Network
  const interfaces = [
    {
      name: 'eth0',
      rx: formatBytes(jitter(baseRxTotal, 500_000_000)),
      tx: formatBytes(jitter(baseTxTotal, 300_000_000)),
      status: 'up',
    },
    {
      name: 'eth1',
      rx: formatBytes(jitter(2_345_600_000, 50_000_000)),
      tx: formatBytes(jitter(1_892_300_000, 30_000_000)),
      status: 'up',
    },
    {
      name: 'lo',
      rx: formatBytes(jitter(823_400_000, 10_000_000)),
      tx: formatBytes(jitter(823_400_000, 10_000_000)),
      status: 'up',
    },
  ]

  // RADIUS
  baseAuthTotal += Math.floor(Math.random() * 15)
  baseAcctTotal += Math.floor(Math.random() * 25)
  const avgRespTime = `${(Math.random() * 3 + 1.5).toFixed(1)} ms`

  // Services
  const services = [
    { name: 'FreeRADIUS', status: 'running', uptime: formatUptime(uptimeSeconds - 120), port: 1812 },
    { name: 'FreeRADIUS (Acct)', status: 'running', uptime: formatUptime(uptimeSeconds - 120), port: 1813 },
    { name: 'SQLite Database', status: 'running', uptime: formatUptime(uptimeSeconds), port: 0 },
    { name: 'Web Server (Next.js)', status: 'running', uptime: formatUptime(uptimeSeconds - 45), port: 3000 },
    { name: 'Cron Daemon', status: 'running', uptime: formatUptime(uptimeSeconds), port: 0 },
    { name: 'Firewall (iptables)', status: 'running', uptime: formatUptime(uptimeSeconds), port: 0 },
  ]

  return NextResponse.json({
    cpu: {
      usage: cpuUsage,
      cores: cpuCores,
      temperature: cpuTemp,
    },
    memory: {
      total: memTotal,
      used: memUsedStr,
      usage: memUsage,
    },
    disk: {
      total: diskTotal,
      used: diskUsedStr,
      usage: diskUsage,
    },
    network: { interfaces },
    uptime: formatUptime(uptimeSeconds),
    radius: {
      status: 'running',
      totalAuth: baseAuthTotal,
      totalAcct: baseAcctTotal,
      avgResponseTime: avgRespTime,
    },
    services,
  })
}
