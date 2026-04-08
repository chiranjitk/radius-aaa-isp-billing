'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Radio,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  Unplug,
  RefreshCw,
  Shield,
  Zap,
  Clock,
  ArrowDownUp,
  Server,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ==========================================
// Types
// ==========================================

export interface RadiusTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultUsername?: string
  defaultSessionId?: string
}

interface NasOption {
  id: string
  ipAddress: string
  nasName: string
  shortName: string | null
}

interface SimulatedResult {
  success: boolean
  responseTime: number
  responseType?: string
  attributes?: { name: string; value: string }[]
  message?: string
  timestamp: string
}

const COA_ATTRIBUTES = [
  { value: 'Session-Timeout', label: 'Session-Timeout', placeholder: 'e.g. 3600 (seconds)' },
  { value: 'Idle-Timeout', label: 'Idle-Timeout', placeholder: 'e.g. 600 (seconds)' },
  { value: 'Bandwidth-Max-Up', label: 'Bandwidth-Max-Up', placeholder: 'e.g. 5120000 (bps)' },
  { value: 'Bandwidth-Max-Down', label: 'Bandwidth-Max-Down', placeholder: 'e.g. 10240000 (bps)' },
]

const TERMINATE_CAUSES = [
  'User-Request',
  'Idle-Timeout',
  'Session-Timeout',
  'Admin-Reset',
  'Admin-Reboot',
  'Port-Error',
  'NAS-Error',
  'NAS-Reboot',
  'Service-Unavailable',
  'Lost-Carrier',
  'Lost-Service',
]

// ==========================================
// Helpers
// ==========================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomIp(): string {
  return `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ==========================================
// Result Card Component
// ==========================================

function ResultCard({ result }: { result: SimulatedResult | null }) {
  if (!result) return null

  return (
    <Card className={`mt-4 border-2 ${result.success ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {result.success ? (
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {result.responseType || (result.success ? 'Success' : 'Failed')}
            </p>
            {result.message && (
              <p className="text-xs text-muted-foreground mt-0.5">{result.message}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-mono text-muted-foreground">
              {result.responseTime}ms
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {result.timestamp}
            </p>
          </div>
        </div>

        {result.attributes && result.attributes.length > 0 && (
          <>
            <Separator className="my-3" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                RADIUS Response Attributes
              </p>
              <div className="space-y-1.5">
                {result.attributes.map((attr, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 text-xs bg-muted/40 rounded-md px-3 py-1.5"
                  >
                    <span className="font-mono font-medium text-foreground shrink-0">
                      {attr.name}
                    </span>
                    <span className="font-mono text-muted-foreground text-right truncate">
                      {attr.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ==========================================
// Spinner Component
// ==========================================

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Radio className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Simulating RADIUS request...</p>
      </div>
    </div>
  )
}

// ==========================================
// Main Dialog Component
// ==========================================

export function RadiusTestDialog({
  open,
  onOpenChange,
  defaultUsername,
  defaultSessionId,
}: RadiusTestDialogProps) {
  // Shared NAS query
  const { data: nasDevices } = useQuery<NasOption[]>({
    queryKey: ['nas-options-radius-test'],
    queryFn: async () => {
      const res = await fetch('/api/nas?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      return (d.devices || d.nasDevices || []).map((n: { id: string; ipAddress: string; nasName: string; shortName: string | null }) => ({
        id: n.id,
        ipAddress: n.ipAddress,
        nasName: n.nasName,
        shortName: n.shortName,
      }))
    },
    staleTime: 60000,
  })

  // ---- Auth Test State ----
  const [authUsername, setAuthUsername] = useState(defaultUsername || '')
  const [authPassword, setAuthPassword] = useState('')
  const [authNasId, setAuthNasId] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authResult, setAuthResult] = useState<SimulatedResult | null>(null)

  // ---- CoA State ----
  const [coaUsername, setCoaUsername] = useState(defaultUsername || '')
  const [coaNasId, setCoaNasId] = useState('')
  const [coaAttribute, setCoaAttribute] = useState('')
  const [coaValue, setCoaValue] = useState('')
  const [coaLoading, setCoaLoading] = useState(false)
  const [coaResult, setCoaResult] = useState<SimulatedResult | null>(null)

  // ---- Disconnect State ----
  const [discUsername, setDiscUsername] = useState(defaultUsername || '')
  const [discSessionId, setDiscSessionId] = useState(defaultSessionId || '')
  const [discNasId, setDiscNasId] = useState('')
  const [discCause, setDiscCause] = useState('Admin-Reset')
  const [discLoading, setDiscLoading] = useState(false)
  const [discResult, setDiscResult] = useState<SimulatedResult | null>(null)

  // ---- Simulated Actions ----

  const simulateAuth = useCallback(async () => {
    if (!authUsername.trim() || !authPassword.trim()) return
    setAuthLoading(true)
    setAuthResult(null)
    const delay = randomInt(500, 1500)
    await sleep(delay)
    const success = Math.random() > 0.15 // 85% chance of success
    setAuthLoading(false)
    setAuthResult({
      success,
      responseTime: delay,
      responseType: success ? 'Access-Accept' : 'Access-Reject',
      message: success
        ? `User "${authUsername}" authenticated successfully via PAP`
        : `Authentication failed for "${authUsername}": invalid credentials`,
      attributes: success
        ? [
            { name: 'Framed-IP-Address', value: randomIp() },
            { name: 'Framed-IP-Netmask', value: '255.255.255.0' },
            { name: 'Session-Timeout', value: `${randomInt(3600, 86400)}` },
            { name: 'Idle-Timeout', value: `${randomInt(300, 1800)}` },
            { name: 'Acct-Interim-Interval', value: '60' },
          ]
        : [
            { name: 'Reply-Message', value: 'Invalid credentials' },
          ],
      timestamp: new Date().toLocaleTimeString(),
    })
  }, [authUsername, authPassword])

  const simulateCoA = useCallback(async () => {
    if (!coaUsername.trim() || !coaAttribute || !coaValue.trim()) return
    setCoaLoading(true)
    setCoaResult(null)
    const delay = randomInt(500, 1200)
    await sleep(delay)
    const success = Math.random() > 0.2 // 80% chance of success
    setCoaLoading(false)
    setCoaResult({
      success,
      responseTime: delay,
      responseType: success ? 'CoA-ACK' : 'CoA-NAK',
      message: success
        ? `Attribute "${coaAttribute}" updated to "${coaValue}" for "${coaUsername}"`
        : `CoA rejected for "${coaUsername}": session not found or attribute not supported`,
      attributes: success
        ? [
            { name: coaAttribute, value: coaValue },
            { name: 'Session-Id', value: `${coaUsername}-${Date.now().toString(36)}` },
          ]
        : [
            { name: 'Error-Cause', value: '503-Session-Context-Not-Found' },
          ],
      timestamp: new Date().toLocaleTimeString(),
    })
  }, [coaUsername, coaAttribute, coaValue])

  const simulateDisconnect = useCallback(async () => {
    const identifier = discUsername.trim() || discSessionId.trim()
    if (!identifier || !discNasId) return
    setDiscLoading(true)
    setDiscResult(null)
    const delay = randomInt(600, 1400)
    await sleep(delay)
    const success = Math.random() > 0.1 // 90% chance of success
    setDiscLoading(false)
    setDiscResult({
      success,
      responseTime: delay,
      responseType: success ? 'Disconnect-ACK' : 'Disconnect-NAK',
      message: success
        ? `Session for "${identifier}" terminated with cause "${discCause}"`
        : `Disconnect failed: session not found on NAS`,
      attributes: success
        ? [
            { name: 'Terminate-Cause', value: discCause },
            { name: 'Acct-Terminate-Cause', value: discCause },
            { name: 'Session-Time', value: `${randomInt(60, 7200)}` },
          ]
        : [
            { name: 'Error-Cause', value: '503-Session-Context-Not-Found' },
          ],
      timestamp: new Date().toLocaleTimeString(),
    })
  }, [discUsername, discSessionId, discNasId, discCause])

  const nasLabel = (n: NasOption) =>
    `${n.shortName || n.nasName} (${n.ipAddress})`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            RADIUS Test Tool
          </DialogTitle>
          <DialogDescription>
            Simulate RADIUS operations for testing before deploying to production FreeRADIUS.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="auth" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auth" className="gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" />
              Test Auth
            </TabsTrigger>
            <TabsTrigger value="coa" className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              CoA
            </TabsTrigger>
            <TabsTrigger value="disconnect" className="gap-1.5 text-xs">
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </TabsTrigger>
          </TabsList>

          {/* ==================== Auth Tab ==================== */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="auth-username">Username</Label>
                <Input
                  id="auth-username"
                  placeholder="Enter RADIUS username"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Enter RADIUS password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>NAS (Target Server)</Label>
                <Select value={authNasId} onValueChange={setAuthNasId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a NAS device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nasDevices?.map((nas) => (
                      <SelectItem key={nas.id} value={nas.id}>
                        {nasLabel(nas)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full gap-2"
                onClick={simulateAuth}
                disabled={authLoading || !authUsername.trim() || !authPassword.trim()}
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                {authLoading ? 'Testing...' : 'Test Authentication'}
              </Button>
            </div>

            {authLoading && <LoadingSpinner label="Authenticating..." />}
            <ResultCard result={authResult} />
          </TabsContent>

          {/* ==================== CoA Tab ==================== */}
          <TabsContent value="coa" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="coa-username">Username</Label>
                <Input
                  id="coa-username"
                  placeholder="Enter username of active session"
                  value={coaUsername}
                  onChange={(e) => setCoaUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>NAS (Target Server)</Label>
                <Select value={coaNasId} onValueChange={setCoaNasId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a NAS device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nasDevices?.map((nas) => (
                      <SelectItem key={nas.id} value={nas.id}>
                        {nasLabel(nas)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Attribute to Change</Label>
                <Select value={coaAttribute} onValueChange={(v) => {
                  setCoaAttribute(v)
                  setCoaValue('')
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select attribute..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COA_ATTRIBUTES.map((attr) => (
                      <SelectItem key={attr.value} value={attr.value}>
                        {attr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {coaAttribute && (
                <div className="space-y-2">
                  <Label htmlFor="coa-value">New Value</Label>
                  <Input
                    id="coa-value"
                    placeholder={
                      COA_ATTRIBUTES.find((a) => a.value === coaAttribute)?.placeholder || 'Enter new value'
                    }
                    value={coaValue}
                    onChange={(e) => setCoaValue(e.target.value)}
                  />
                </div>
              )}
              <Button
                className="w-full gap-2"
                onClick={simulateCoA}
                disabled={coaLoading || !coaUsername.trim() || !coaAttribute || !coaValue.trim()}
              >
                {coaLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownUp className="h-4 w-4" />
                )}
                {coaLoading ? 'Sending...' : 'Send CoA Request'}
              </Button>
            </div>

            {coaLoading && <LoadingSpinner label="Sending Change of Authorization..." />}
            <ResultCard result={coaResult} />
          </TabsContent>

          {/* ==================== Disconnect Tab ==================== */}
          <TabsContent value="disconnect" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="disc-username">Username</Label>
                <Input
                  id="disc-username"
                  placeholder="Enter username"
                  value={discUsername}
                  onChange={(e) => setDiscUsername(e.target.value)}
                />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disc-session-id">Session ID</Label>
                <Input
                  id="disc-session-id"
                  placeholder="Enter Acct-Session-Id"
                  value={discSessionId}
                  onChange={(e) => setDiscSessionId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>NAS (Target Server)</Label>
                <Select value={discNasId} onValueChange={setDiscNasId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a NAS device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nasDevices?.map((nas) => (
                      <SelectItem key={nas.id} value={nas.id}>
                        {nasLabel(nas)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Terminate Cause</Label>
                <Select value={discCause} onValueChange={setDiscCause}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMINATE_CAUSES.map((cause) => (
                      <SelectItem key={cause} value={cause}>
                        {cause}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={simulateDisconnect}
                disabled={
                  discLoading ||
                  (!discUsername.trim() && !discSessionId.trim()) ||
                  !discNasId
                }
              >
                {discLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4" />
                )}
                {discLoading ? 'Disconnecting...' : 'Disconnect Session'}
              </Button>
            </div>

            {discLoading && <LoadingSpinner label="Sending Disconnect Request..." />}
            <ResultCard result={discResult} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default RadiusTestDialog
