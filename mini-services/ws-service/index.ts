import { WebSocketServer, WebSocket } from 'ws'

const PORT = 3003
const wss = new WebSocketServer({ port: PORT })

interface Client {
  ws: WebSocket
  id: string
  lastPing: number
}

const clients = new Map<string, Client>()
let clientIdCounter = 0

const EVENT_TYPES = [
  { type: 'auth_success', severity: 'success', messages: [
    'User {user} authenticated via PAP from {ip}',
    'User {user} authenticated via EAP-PEAP from {ip}',
    'User {user} authenticated via MS-CHAPv2 from {ip}',
  ]},
  { type: 'auth_failure', severity: 'warning', messages: [
    'Authentication failed for {user} from {ip} - invalid password',
    'EAP identity not found for {user} from {ip}',
  ]},
  { type: 'session_start', severity: 'info', messages: [
    'Session started for {user} on NAS {nas} (IP: {sessionIp})',
    'PPPoE session started for {user} - Framed-IP: {sessionIp}',
  ]},
  { type: 'session_stop', severity: 'info', messages: [
    'Session ended for {user} - Duration: {duration}, Cause: {cause}',
    'User {user} disconnected from {nas} - Session timeout',
  ]},
  { type: 'nas_event', severity: 'info', messages: [
    'NAS {nas} came online - {sessions} active sessions',
    'CoA-ACK received for {user} on {nas} - Session-Timeout updated',
    'Disconnect-ACK sent for {user} on {nas}',
  ]},
  { type: 'alert', severity: 'warning', messages: [
    'High authentication failure rate detected: {count} failures in 5 minutes',
    'NAS {nas} response latency exceeded 500ms threshold',
    'Memory usage at {percent}% - consider restarting FreeRADIUS',
  ]},
]

const USERS = ['john.doe','jane.smith','bob.wilson','alice.chen','chris.park','emma.davis','mike.lee','sara.kim','alex.taylor','lisa.wang']
const NAS_DEVICES = ['BR-Router-01','MikroTik-AP-01','DC-Switch-02','Cisco-ASA-01','Juniper-SRX-01']
const IPS = ['192.168.1.100','10.0.2.55','172.16.0.23','192.168.10.15','10.0.5.200']
const SESSION_IPS = ['10.0.1.101','10.0.1.102','10.0.2.55','10.0.3.200','172.16.0.23']
const DURATIONS = ['1h 23m','45m 12s','3h 05m','12m 45s','6h 30m','2h 15m']
const CAUSES = ['User-Request','Session-Timeout','Admin-Reset','Idle-Timeout','Port-Error']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function generateEvent() {
  const et = pick(EVENT_TYPES)
  let msg = pick(et.messages)
  const user = pick(USERS), nas = pick(NAS_DEVICES), ip = pick(IPS), sip = pick(SESSION_IPS)
  msg = msg.replace('{user}',user).replace('{ip}',ip).replace('{nas}',nas).replace('{sessionIp}',sip)
    .replace('{duration}',pick(DURATIONS)).replace('{cause}',pick(CAUSES))
    .replace('{count}',String(Math.floor(Math.random()*50)+5)).replace('{percent}',String(Math.floor(Math.random()*30)+70))
  return { id:`evt-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, type:et.type, severity:et.severity, message:msg, timestamp:new Date().toISOString(), data:{user,nas,ip,sessionIp:sip} }
}

function broadcast(data: object) {
  const m = JSON.stringify(data)
  for (const [,c] of clients) { try { if(c.ws.readyState===1) c.ws.send(m) } catch { clients.delete(c.id) } }
}

function scheduleEvent() {
  setTimeout(() => { broadcast({type:'radius_event',event:generateEvent()}); scheduleEvent() }, 3000+Math.random()*5000)
}

wss.on('connection',(ws)=>{
  const id = `client-${++clientIdCounter}`
  clients.set(id,{ws,id,lastPing:Date.now()})
  ws.send(JSON.stringify({type:'connected',clientId:id,serverTime:new Date().toISOString()}))
  ws.send(JSON.stringify({type:'stats',connectedClients:clients.size,eventsPerMinute:12+Math.floor(Math.random()*8)}))
  ws.on('pong',()=>{ const c=clients.get(id); if(c)c.lastPing=Date.now() })
  ws.on('close',()=>clients.delete(id))
  ws.on('error',()=>clients.delete(id))
})

scheduleEvent()

setInterval(()=>{
  for(const [,c] of clients){ if(c.ws.readyState===1)c.ws.ping() }
  const now=Date.now()
  for(const[id,c] of clients){ if(now-c.lastPing>60000){c.ws.terminate();clients.delete(id)} }
},30000)

console.log(`WebSocket RADIUS Event Service running on port ${PORT}`)
