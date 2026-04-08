'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Radio,
  CreditCard,
  Mail,
  FileCode,
  ClipboardList,
  Search,
  Save,
  Copy,
  RotateCcw,
  Shield,
  Loader2,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToJSON, type ExportOptions } from '@/lib/export-utils'
import { toast } from 'sonner'

// ============ Types ============
interface Setting {
  id: string
  key: string
  value: string
  type: string
  description: string | null
}

interface AuditLog {
  id: string
  userId: string | null
  username: string | null
  action: string
  module: string
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

// ============ Default Settings ============
const DEFAULT_SETTINGS: Record<string, Setting[]> = {
  general: [
    { id: 'gen-1', key: 'system_name', value: 'FreeRADIUS BSS', type: 'string', description: 'System display name' },
    { id: 'gen-2', key: 'timezone', value: 'UTC', type: 'string', description: 'System timezone' },
    { id: 'gen-3', key: 'language', value: 'en', type: 'string', description: 'Default language' },
    { id: 'gen-4', key: 'logo_url', value: '', type: 'string', description: 'Custom logo URL' },
  ],
  radius: [
    { id: 'rad-1', key: 'auth_port', value: '1812', type: 'number', description: 'RADIUS authentication port' },
    { id: 'rad-2', key: 'acct_port', value: '1813', type: 'number', description: 'RADIUS accounting port' },
    { id: 'rad-3', key: 'coa_port', value: '3799', type: 'number', description: 'CoA (Change of Authorization) port' },
    { id: 'rad-4', key: 'secret', value: 'radsec2024!', type: 'string', description: 'RADIUS shared secret' },
    { id: 'rad-5', key: 'max_request_time', value: '30', type: 'number', description: 'Maximum request time in seconds' },
    { id: 'rad-6', key: 'retry_count', value: '3', type: 'number', description: 'Number of retries on failure' },
    { id: 'rad-7', key: 'dead_time', value: '30', type: 'number', description: 'Dead time in seconds before retrying a dead server' },
  ],
  billing: [
    { id: 'bil-1', key: 'currency', value: 'USD', type: 'string', description: 'Base currency for billing' },
    { id: 'bil-2', key: 'tax_rate', value: '10', type: 'number', description: 'Default tax rate in percent' },
    { id: 'bil-3', key: 'payment_methods', value: 'cash,card,bank_transfer,online,wallet', type: 'string', description: 'Available payment methods (comma-separated)' },
    { id: 'bil-4', key: 'invoice_prefix', value: 'INV', type: 'string', description: 'Invoice number prefix' },
    { id: 'bil-5', key: 'auto_invoice', value: 'true', type: 'boolean', description: 'Automatically generate invoices on billing cycle' },
    { id: 'bil-6', key: 'grace_period', value: '7', type: 'number', description: 'Grace period in days after due date' },
  ],
  email: [
    { id: 'eml-1', key: 'smtp_host', value: 'smtp.gmail.com', type: 'string', description: 'SMTP server hostname' },
    { id: 'eml-2', key: 'smtp_port', value: '587', type: 'number', description: 'SMTP server port' },
    { id: 'eml-3', key: 'smtp_user', value: '', type: 'string', description: 'SMTP username' },
    { id: 'eml-4', key: 'smtp_pass', value: '', type: 'string', description: 'SMTP password' },
    { id: 'eml-5', key: 'smtp_encryption', value: 'tls', type: 'string', description: 'Encryption type (tls/ssl/none)' },
    { id: 'eml-6', key: 'from_email', value: 'radius@company.com', type: 'string', description: 'Sender email address' },
    { id: 'eml-7', key: 'from_name', value: 'FreeRADIUS BSS', type: 'string', description: 'Sender display name' },
  ],
  sms: [
    { id: 'sms-1', key: 'sms_gateway', value: 'twilio', type: 'string', description: 'SMS gateway provider' },
    { id: 'sms-2', key: 'sms_api_key', value: '', type: 'string', description: 'SMS API key' },
    { id: 'sms-3', key: 'sms_api_secret', value: '', type: 'string', description: 'SMS API secret' },
    { id: 'sms-4', key: 'sms_from_number', value: '', type: 'string', description: 'Sender phone number' },
    { id: 'sms-5', key: 'sms_enabled', value: 'false', type: 'boolean', description: 'Enable SMS notifications' },
  ],
}

// ============ FreeRADIUS Config Templates ============
const FREERADIUS_REST_CONFIG = `# FreeRADIUS rlm_rest configuration
# This module connects FreeRADIUS to the BSS REST API for real-time authentication

rest default {
    uri = "https://your-bss-domain.com/api/radius"
    method = "post"
    body = "application/json"

    # Authentication request configuration
    authenticate = {
        uri = "${"/api/radius/auth"}"
        body = '{
            "username": "%{User-Name}",
            "password": "%{User-Password}",
            "nas_ip": "%{NAS-IP-Address}",
            "nas_port": "%{NAS-Port}",
            "calling_station": "%{Calling-Station-Id}",
            "called_station": "%{Called-Station-Id}"
        }'
    }

    # Authorization (post-auth) configuration
    post-auth = {
        uri = "${"/api/radius/post-auth"}"
        body = '{
            "username": "%{User-Name}",
            "session_id": "%{Acct-Session-Id}",
            "reply": "%{reply:Packet-Type}",
            "framed_ip": "%{Framed-IP-Address}",
            "nas_ip": "%{NAS-IP-Address}"
        }'
    }

    # Accounting configuration
    accounting = {
        uri = "${"/api/radius/accounting"}"
        body = '{
            "session_id": "%{Acct-Session-Id}",
            "username": "%{User-Name}",
            "status_type": "%{Acct-Status-Type}",
            "session_time": "%{Acct-Session-Time}",
            "input_octets": "%{Acct-Input-Octets}",
            "output_octets": "%{Acct-Output-Octets}",
            "nas_ip": "%{NAS-IP-Address}",
            "terminate_cause": "%{Acct-Terminate-Cause}"
        }'
    }

    # TLS configuration (optional)
    tls = {
        # enable = yes
        # ca_file = "\${certdir}/ca.pem"
        # cert_file = "\${certdir}/client.pem"
        # key_file = "\${certdir}/client.key"
    }

    # Timeouts
    timeout = 5
    connect_timeout = 3
}`

const FREERADIUS_SITES_AVAILABLE = `# sites-available/default - Main server configuration
# Configure the rest module as the primary authentication source

server default {
    listen {
        type = auth
        ipaddr = *
        port = 1812
    }

    listen {
        type = acct
        ipaddr = *
        port = 1813
    }

    # Authorization phase
    authorize {
        # Update request with useful attributes
        update request {
            &FreeRADIUS-Client-IP-Address = "%{Packet-Src-IP-Address}"
            &FreeRADIUS-Client-Shortname = "%{Packet-Src-IP-Address}"
        }

        # REST API authentication
        rest

        # Fallthrough to local files if REST fails
        # -files
        #-sql
    }

    # Authentication phase
    authenticate {
        # Auth-Type REST {
        #     rest
        # }
        Auth-Type PAP {
            pap
        }
        Auth-Type CHAP {
            chap
        }
        Auth-Type MS-CHAP {
            mschap
        }
        Auth-Type EAP {
            eap
        }
    }

    # Post-auth processing
    post-auth {
        # Send accounting info to REST API
        rest

        # Reply attributes from the API response
        update reply {
            &Reply-Message += "Authentication successful"
        }
    }

    # Pre-accounting processing
    preacct {
        preprocess
        acct_unique
    }

    # Accounting phase
    accounting {
        # Send accounting data to REST API
        rest

        # Also write to local detail file for backup
        detail
        unix
    }

    # Session management
    session {
        rest
    }
}`

const FREERADIUS_USERS_FILE = `# users file - Local user fallback
# NOTE: When using REST module for authentication, this file acts as fallback

# Default profile - Applied to all users unless overridden by REST API response
DEFAULT Auth-Type = PAP
    Service-Type = Framed-User,
    Framed-Protocol = PPP,
    Framed-Compression = Van-Jacobson-TCP-IP

# Guest access policy
guest.reception  Cleartext-Password := "Guest@01"
    Simultaneous-Use = 1,
    Session-Timeout = 3600,
    Idle-Timeout = 300

guest.confroom  Cleartext-Password := "Guest@02"
    Simultaneous-Use = 1,
    Session-Timeout = 3600,
    Idle-Timeout = 300

# Admin fallback (in case REST is unavailable)
admin.root  Cleartext-Password := "Adm1nR00t!"
    Service-Type = Administrative-User,
    Simultaneous-Use = 10,
    Fall-Through = No

# Example user with bandwidth limit
DEFAULT  Group == "standard-users"
    Mikrotik-Rate-Limit = "50M/25M",
    Session-Timeout = 28800,
    Idle-Timeout = 900

DEFAULT  Group == "premium-users"
    Mikrotik-Rate-Limit = "100M/50M",
    Session-Timeout = 43200,
    Idle-Timeout = 1800

DEFAULT  Group == "vip-users"
    Mikrotik-Rate-Limit = "500M/500M",
    Session-Timeout = 86400,
    Idle-Timeout = 3600`

// ============ Settings Loading Skeleton ============
function SettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-4 w-72 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ============ Tab Content Skeleton ============
function TabContentSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      <SettingsSkeleton />
    </div>
  )
}

// ============ Component ============
export function SettingsView() {
  const [settings, setSettings] = useState<Record<string, Setting[]>>(DEFAULT_SETTINGS)
  const [modifiedSettings, setModifiedSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

  // Tab switching loading state
  const [activeTab, setActiveTab] = useState('general')
  const [tabSwitching, setTabSwitching] = useState(false)

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditModule, setAuditModule] = useState('')
  const [auditAction, setAuditAction] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.settings && Object.keys(data.settings).length > 0) {
          setSettings(data.settings)
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Update setting value locally
  const updateSetting = (key: string, value: string) => {
    setModifiedSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Save all settings
  const saveSettings = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const entries = Object.entries(modifiedSettings)
      for (const [key, value] of entries) {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
        if (!res.ok) throw new Error(`Failed to save setting "${key}": HTTP ${res.status}`)
      }
      // Update local state
      const updatedSettings = { ...settings }
      for (const [key, value] of entries) {
        for (const group of Object.values(updatedSettings)) {
          const setting = group.find((s) => s.key === key)
          if (setting) setting.value = value
        }
      }
      setSettings(updatedSettings)
      setModifiedSettings({})
      toast.success('Settings saved successfully')
      await fetchSettings()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Discard changes
  const handleDiscard = () => {
    setModifiedSettings({})
    setDiscardDialogOpen(false)
    toast.info('All unsaved changes have been discarded')
  }

  // Handle tab change with brief loading state
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setTabSwitching(true)
    setTimeout(() => setTabSwitching(false), 300)
  }

  // Get current value for a setting
  const getValue = (key: string) => {
    if (modifiedSettings[key] !== undefined) return modifiedSettings[key]
    for (const group of Object.values(settings)) {
      const setting = group.find((s) => s.key === key)
      if (setting) return setting.value
    }
    return ''
  }

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const params = new URLSearchParams()
      if (auditSearch) params.set('username', auditSearch)
      if (auditModule) params.set('module', auditModule)
      if (auditAction) params.set('action', auditAction)
      params.set('page', auditPage.toString())
      params.set('pageSize', '20')

      const res = await fetch(`/api/settings/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.logs)
        setAuditTotalPages(data.totalPages)
      }
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setAuditLoading(false)
    }
  }, [auditSearch, auditModule, auditAction, auditPage])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const hasChanges = Object.keys(modifiedSettings).length > 0

  return (
    <div className="space-y-6">
      {/* Loading Indicator at Top */}
      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Loading settings...
          </span>
        </div>
      )}

      {/* Action Bar */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-2">
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            Unsaved changes
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiscardDialogOpen(true)}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={saveSettings}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save All
              </>
            )}
          </Button>
        </div>
      )}

      {/* Discard Confirmation AlertDialog */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard all unsaved changes? This action cannot be undone and your modifications will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5 hidden sm:block" />
            General
          </TabsTrigger>
          <TabsTrigger value="radius" className="gap-1.5 text-xs">
            <Radio className="h-3.5 w-3.5 hidden sm:block" />
            RADIUS
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs">
            <CreditCard className="h-3.5 w-3.5 hidden sm:block" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="emailsms" className="gap-1.5 text-xs">
            <Mail className="h-3.5 w-3.5 hidden sm:block" />
            Email/SMS
          </TabsTrigger>
          <TabsTrigger value="freeradius" className="gap-1.5 text-xs">
            <FileCode className="h-3.5 w-3.5 hidden sm:block" />
            FreeRADIUS
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5 hidden sm:block" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* ===== GENERAL SETTINGS ===== */}
        <TabsContent value="general">
          {loading || tabSwitching ? (
            <TabContentSkeleton />
          ) : (
            <Card className="mt-4 inset-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Core system configuration options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(settings.general || []).map((s) => (
                  <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
                    <div>
                      <Label className="text-sm font-medium">{s.description || s.key}</Label>
                      <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                    </div>
                    <Input
                      value={getValue(s.key)}
                      onChange={(e) => updateSetting(s.key, e.target.value)}
                      placeholder={s.description || s.key}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== RADIUS SETTINGS ===== */}
        <TabsContent value="radius">
          {loading || tabSwitching ? (
            <TabContentSkeleton />
          ) : (
            <Card className="mt-4 inset-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  RADIUS Configuration
                </CardTitle>
                <CardDescription>FreeRADIUS server ports and connection settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(settings.radius || []).map((s) => (
                  <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
                    <div>
                      <Label className="text-sm font-medium">{s.description || s.key}</Label>
                      <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                    </div>
                    {s.type === 'number' ? (
                      <Input
                        type="number"
                        value={getValue(s.key)}
                        onChange={(e) => updateSetting(s.key, e.target.value)}
                      />
                    ) : (
                      <Input
                        type={s.key === 'secret' ? 'password' : 'text'}
                        value={getValue(s.key)}
                        onChange={(e) => updateSetting(s.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== BILLING SETTINGS ===== */}
        <TabsContent value="billing">
          {loading || tabSwitching ? (
            <TabContentSkeleton />
          ) : (
            <Card className="mt-4 inset-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing Settings
                </CardTitle>
                <CardDescription>Configure billing behavior, currency, and payment options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(settings.billing || []).map((s) => (
                  <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
                    <div>
                      <Label className="text-sm font-medium">{s.description || s.key}</Label>
                      <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                    </div>
                    {s.type === 'boolean' ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={getValue(s.key) === 'true'}
                          onCheckedChange={(checked) => updateSetting(s.key, String(checked))}
                        />
                        <span className="text-sm text-muted-foreground">
                          {getValue(s.key) === 'true' ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ) : (
                      <Input
                        type={s.type === 'number' ? 'number' : 'text'}
                        value={getValue(s.key)}
                        onChange={(e) => updateSetting(s.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== EMAIL/SMS SETTINGS ===== */}
        <TabsContent value="emailsms">
          {loading || tabSwitching ? (
            <div className="mt-4 space-y-4">
              <SettingsSkeleton />
              <SettingsSkeleton />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* SMTP Settings */}
              <Card className="inset-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    SMTP Configuration
                  </CardTitle>
                  <CardDescription>Email server settings for notifications and invoices.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(settings.email || []).map((s) => (
                    <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
                      <div>
                        <Label className="text-sm font-medium">{s.description || s.key}</Label>
                        <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                      </div>
                      <Input
                        type={s.key.includes('pass') || s.key.includes('secret') ? 'password' : s.type === 'number' ? 'number' : 'text'}
                        value={getValue(s.key)}
                        onChange={(e) => updateSetting(s.key, e.target.value)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* SMS Settings */}
              <Card className="inset-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    SMS Gateway
                  </CardTitle>
                  <CardDescription>Configure SMS notifications for alerts and OTP.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(settings.sms || []).map((s) => (
                    <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr] sm:items-center">
                      <div>
                        <Label className="text-sm font-medium">{s.description || s.key}</Label>
                        <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                      </div>
                      {s.type === 'boolean' ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={getValue(s.key) === 'true'}
                            onCheckedChange={(checked) => updateSetting(s.key, String(checked))}
                          />
                          <span className="text-sm text-muted-foreground">
                            {getValue(s.key) === 'true' ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ) : (
                        <Input
                          type={s.key.includes('secret') || s.key.includes('key') ? 'password' : 'text'}
                          value={getValue(s.key)}
                          onChange={(e) => updateSetting(s.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ===== FreeRADIUS CONFIG ===== */}
        <TabsContent value="freeradius">
          {loading || tabSwitching ? (
            <div className="mt-4 space-y-4">
              <SettingsSkeleton />
            </div>
          ) : (
            <Card className="mt-4 inset-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Generated FreeRADIUS Configuration
                </CardTitle>
                <CardDescription>
                  Auto-generated configuration files for integrating FreeRADIUS with this BSS via the rlm_rest module.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* REST Module Config */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">mods-available/rest</Label>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(FREERADIUS_REST_CONFIG)} className="gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto max-h-[360px] overflow-y-auto font-mono leading-relaxed">
                    <code>{FREERADIUS_REST_CONFIG}</code>
                  </pre>
                </div>

                <Separator />

                {/* sites-available/default */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">sites-available/default</Label>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(FREERADIUS_SITES_AVAILABLE)} className="gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto max-h-[360px] overflow-y-auto font-mono leading-relaxed">
                    <code>{FREERADIUS_SITES_AVAILABLE}</code>
                  </pre>
                </div>

                <Separator />

                {/* users file */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">users (fallback)</Label>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(FREERADIUS_USERS_FILE)} className="gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto max-h-[360px] overflow-y-auto font-mono leading-relaxed">
                    <code>{FREERADIUS_USERS_FILE}</code>
                  </pre>
                </div>

                <Separator />

                {/* Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Setup Instructions</h4>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Copy the <code className="bg-muted px-1 rounded">mods-available/rest</code> file to <code className="bg-muted px-1 rounded">/etc/freeradius/3.0/mods-enabled/rest</code></li>
                    <li>Copy the <code className="bg-muted px-1 rounded">sites-available/default</code> file to <code className="bg-muted px-1 rounded">/etc/freeradius/3.0/sites-enabled/default</code></li>
                    <li>Update the URI in the rest module to point to your BSS server&apos;s API endpoint</li>
                    <li>Configure TLS certificates if using HTTPS</li>
                    <li>Restart FreeRADIUS: <code className="bg-muted px-1 rounded">systemctl restart freeradius</code></li>
                    <li>Test with: <code className="bg-muted px-1 rounded">radtest username password localhost 1812 testing123</code></li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== AUDIT LOGS ===== */}
        <TabsContent value="audit">
          {loading || tabSwitching ? (
            <div className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-40" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by username..."
                        value={auditSearch}
                        onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1) }}
                        className="pl-9"
                      />
                    </div>
                    <Select value={auditModule} onValueChange={(v) => { setAuditModule(v === 'all' ? '' : v); setAuditPage(1) }}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="All Modules" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="nas">NAS</SelectItem>
                        <SelectItem value="plans">Plans</SelectItem>
                        <SelectItem value="policies">Policies</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="sessions">Sessions</SelectItem>
                        <SelectItem value="settings">Settings</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={auditAction} onValueChange={(v) => { setAuditAction(v === 'all' ? '' : v); setAuditPage(1) }}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="All Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                        <SelectItem value="logout">Logout</SelectItem>
                        <SelectItem value="export">Export</SelectItem>
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={auditLoading || auditLogs.length === 0}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Export</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            const opts: ExportOptions = {
                              headers: ['Timestamp', 'Username', 'Action', 'Module', 'Details', 'IP Address'],
                              rows: auditLogs.map((log) => [
                                new Date(log.timestamp).toLocaleString(),
                                log.username || '—',
                                log.action,
                                log.module,
                                log.details || '—',
                                log.ipAddress || '—',
                              ]),
                              filename: `audit-logs-${new Date().toISOString().split('T')[0]}`,
                              title: 'Audit Log Export',
                            }
                            exportToCSV(opts)
                            toast.success('Audit logs exported as CSV')
                          }}
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const opts: ExportOptions = {
                              headers: ['Timestamp', 'Username', 'Action', 'Module', 'Details', 'IP Address'],
                              rows: auditLogs.map((log) => [
                                new Date(log.timestamp).toLocaleString(),
                                log.username || '—',
                                log.action,
                                log.module,
                                log.details || '—',
                                log.ipAddress || '—',
                              ]),
                              filename: `audit-logs-${new Date().toISOString().split('T')[0]}`,
                            }
                            exportToJSON(opts)
                            toast.success('Audit logs exported as JSON')
                          }}
                        >
                          <FileJson className="mr-2 h-4 w-4" />
                          Export JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Logs Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[520px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 bg-card z-10">Timestamp</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">User</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">Action</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">Module</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">Details</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">IP Address</TableHead>
                          <TableHead className="sticky top-0 bg-card z-10">User Agent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLoading ? (
                          <>
                            {Array.from({ length: 8 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell colSpan={7} className="p-2">
                                  <Skeleton className="h-8 w-full" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        ) : auditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              No audit logs found
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.map((log) => (
                            <TableRow key={log.id} className="table-row-hover">
                              <TableCell className="text-xs whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm font-medium">{log.username || '—'}</TableCell>
                              <TableCell>
                                <ActionBadge action={log.action} />
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                                  {log.module}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {log.details || '—'}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {log.ipAddress || '—'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={log.userAgent || undefined}>
                                {log.userAgent || '—'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {auditTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <p className="text-sm text-muted-foreground">Page {auditPage} of {auditTotalPages}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAuditPage(Math.max(1, auditPage - 1))} disabled={auditPage <= 1}>
                          Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setAuditPage(Math.min(auditTotalPages, auditPage + 1))} disabled={auditPage >= auditTotalPages}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============ Action Badge ============
// Action badge component
function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    update: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    delete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    login: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
    logout: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    export: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize chip ${styles[action] || 'bg-gray-100 text-gray-600'}`}>
      {action}
    </span>
  )
}
