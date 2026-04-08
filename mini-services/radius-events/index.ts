// ==========================================
// RADIUS Events WebSocket Mini-Service
// Port: 3003 | No external dependencies
// Uses Bun.serve() with native WebSocket
// ==========================================

const PORT = 3003

// ==========================================
// Data Pools for Randomization
// ==========================================

const USERNAMES = [
  'john.smith', 'david.kim', 'sarah.chen', 'james.mitchell', 'emily.wang',
  'mike.brown', 'lisa.taylor', 'alex.johnson', 'maria.garcia', 'chris.lee',
]

const NAS_IPS = ['10.0.0.1', '10.0.0.2', '192.168.10.1', '10.0.1.1', '172.16.0.1']

const DURATIONS = ['1h 23m', '45m', '3h 12m', '2d 5h', '30m', '6h 45m']

const BANDWIDTHS = ['2.4 GB', '850 MB', '5.1 GB', '1.2 GB', '3.8 GB']

const NAS_STATUSES = ['reachable', 'high latency (250ms)', 'recovered']

// ==========================================
// Event Type Definitions
// ==========================================

type Severity = 'success' | 'warning' | 'info' | 'error'

interface EventTemplate {
  type: string
  severity: Severity
  build: () => { message: string; data: Record<string, string> }
}

function randomClientIp(): string {
  const lastOctet = Math.floor(Math.random() * 101) + 100 // 100-200
  return `192.168.1.${lastOctet}`
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: 'auth_success',
    severity: 'success',
    build: () => {
      const username = pick(USERNAMES)
      const nas = pick(NAS_IPS)
      return {
        message: `User ${username} authenticated via NAS ${nas}`,
        data: { user: username, nas, ip: randomClientIp() },
      }
    },
  },
  {
    type: 'auth_failure',
    severity: 'error',
    build: () => {
      const username = pick(USERNAMES)
      const ip = randomClientIp()
      return {
        message: `Authentication failed for ${username} from ${ip}`,
        data: { user: username, ip },
      }
    },
  },
  {
    type: 'session_start',
    severity: 'info',
    build: () => {
      const username = pick(USERNAMES)
      const nas = pick(NAS_IPS)
      const ip = randomClientIp()
      return {
        message: `Session started for ${username} on ${nas} (${ip})`,
        data: { user: username, nas, ip },
      }
    },
  },
  {
    type: 'session_stop',
    severity: 'info',
    build: () => {
      const username = pick(USERNAMES)
      const duration = pick(DURATIONS)
      const dataUsed = pick(BANDWIDTHS)
      return {
        message: `Session ended for ${username} (duration: ${duration}, data: ${dataUsed})`,
        data: { user: username },
      }
    },
  },
  {
    type: 'nas_event',
    severity: 'warning',
    build: () => {
      const nas = pick(NAS_IPS)
      const status = pick(NAS_STATUSES)
      return {
        message: `NAS ${nas} status change: ${status}`,
        data: { nas },
      }
    },
  },
  {
    type: 'alert',
    severity: 'warning',
    build: () => {
      const username = pick(USERNAMES)
      const bandwidth = pick(BANDWIDTHS)
      return {
        message: `High bandwidth usage detected: ${username} (${bandwidth})`,
        data: { user: username },
      }
    },
  },
]

// ==========================================
// Event Generation
// ==========================================

interface RadiusEvent {
  id: string
  type: string
  severity: Severity
  message: string
  timestamp: string
  data: {
    user?: string
    nas?: string
    ip?: string
  }
}

function generateEvent(): RadiusEvent {
  const template = pick(EVENT_TEMPLATES)
  const { message, data } = template.build()
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: template.type,
    severity: template.severity,
    message,
    timestamp: new Date().toISOString(),
    data,
  }
}

// ==========================================
// WebSocket Server
// ==========================================

interface ClientState {
  ws: WebSocket
  intervalId: ReturnType<typeof setInterval> | null
}

const clients = new Set<ClientState>()

function sendEventToClient(client: ClientState) {
  const event = generateEvent()
  const payload = JSON.stringify({ type: 'radius_event', event })
  try {
    client.ws.send(payload)
    console.log(`[evt] ${event.type} | ${event.severity} | ${event.message}`)
  } catch {
    cleanupClient(client)
  }
}

function randomInterval(): number {
  return 2000 + Math.random() * 3000 // 2-5 seconds
}

function startEventStream(client: ClientState) {
  const scheduleNext = () => {
    if (client.intervalId) clearInterval(client.intervalId)
    const delay = randomInterval()
    client.intervalId = setInterval(() => {
      sendEventToClient(client)
      // Reschedule with a new random interval for variety
      clearInterval(client.intervalId!)
      scheduleNext()
    }, delay)
  }
  scheduleNext()
}

function cleanupClient(client: ClientState) {
  if (client.intervalId) {
    clearInterval(client.intervalId)
    client.intervalId = null
  }
  clients.delete(client)
}

// ==========================================
// Bun.serve with WebSocket Upgrade
// ==========================================

Bun.serve({
  port: PORT,

  fetch(server, req) {
    // Only accept WebSocket upgrade requests
    const upgradeHeader = req.headers.get('upgrade')
    if (upgradeHeader !== 'websocket') {
      return new Response('RADIUS Events WebSocket Service', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Upgrade to WebSocket
    const success = server.upgrade(req)
    if (!success) {
      return new Response('WebSocket upgrade failed', { status: 500 })
    }

    // Bun handles the upgrade — this return value won't be used
    return new Response()
  },

  websocket: {
    open(ws) {
      console.log(`[ws] Client connected (total: ${clients.size + 1})`)
      const client: ClientState = { ws, intervalId: null }
      clients.add(client)
      startEventStream(client)
    },

    close(ws, code, reason) {
      const client = findClient(ws)
      if (client) {
        cleanupClient(client)
        console.log(`[ws] Client disconnected (code: ${code}, total: ${clients.size})`)
      }
    },

    drain(ws) {
      // Backpressure: write buffer is empty again
    },

    message(ws, message) {
      // Handle incoming messages if needed (ping/pong etc.)
      if (typeof message === 'string') {
        try {
          const parsed = JSON.parse(message)
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
          }
        } catch {
          // Ignore malformed messages
        }
      }
    },
  },
})

function findClient(ws: WebSocket): ClientState | undefined {
  for (const client of clients) {
    if (client.ws === ws) return client
  }
  return undefined
}

console.log(`🔴 RADIUS Events WebSocket Service running on port ${PORT}`)
console.log(`   WebSocket endpoint: ws://localhost:${PORT}`)
console.log(`   Event types: ${EVENT_TEMPLATES.map((t) => t.type).join(', ')}`)
console.log(`   Generating events every 2-5 seconds per client`)
