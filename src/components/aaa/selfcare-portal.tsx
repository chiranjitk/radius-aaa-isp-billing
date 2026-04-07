'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Clock,
  Shield,
  Wifi,
  WifiOff,
  Activity,
  FileText,
  Download,
  Eye,
  EyeOff,
  Lock,
  Upload,
  Camera,
  Key,
  CheckCircle2,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Zap,
  CalendarDays,
  Building2,
  RefreshCw,
  MonitorSmartphone,
  AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ==========================================
// Types (demo/simulated data)
// ==========================================

interface DemoUser {
  id: string
  username: string
  fullName: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  state: string
  country: string
  plan: string
  status: string
  kycStatus: string
  profilePhoto?: string
  joinedDate: string
  expiryDate: string
  nextBilling: string
  dataUsed: number
  dataLimit: number
  speedDown: number
  speedUp: number
  online: boolean
  currentIp?: string
  sessionStart?: string
  monthlyUsage: number
}

// ==========================================
// Simulated Data
// ==========================================

const DEMO_USER: DemoUser = {
  id: 'usr_demo_001',
  username: 'john.doe',
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 234 567 8900',
  company: '',
  address: '123 Main Street',
  city: 'New York',
  state: 'NY',
  country: 'United States',
  plan: 'Fiber 100 Mbps',
  status: 'active',
  kycStatus: 'verified',
  joinedDate: '2025-01-15T00:00:00Z',
  expiryDate: '2026-01-15T00:00:00Z',
  nextBilling: '2026-05-01T00:00:00Z',
  dataUsed: 67.5,
  dataLimit: 100,
  speedDown: 100,
  speedUp: 50,
  online: true,
  currentIp: '10.0.1.45',
  sessionStart: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  monthlyUsage: 67.5,
}

const DEMO_SESSIONS = [
  { id: '1', startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), stopTime: null, duration: 10800, dataDown: '2.3 GB', dataUp: '0.8 GB', nas: 'NAS-01', ip: '10.0.1.45', status: 'active' },
  { id: '2', startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), stopTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), duration: 14400, dataDown: '5.1 GB', dataUp: '1.2 GB', nas: 'NAS-02', ip: '10.0.1.78', status: 'stopped' },
  { id: '3', startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), stopTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), duration: 7200, dataDown: '1.8 GB', dataUp: '0.4 GB', nas: 'NAS-01', ip: '10.0.1.92', status: 'stopped' },
]

const DEMO_INVOICES = [
  { id: '1', invoiceNo: 'INV-2026-0042', amount: 49.99, status: 'paid', dueDate: '2026-04-01T00:00:00Z', paidDate: '2026-03-30T00:00:00Z' },
  { id: '2', invoiceNo: 'INV-2026-0043', amount: 49.99, status: 'pending', dueDate: '2026-05-01T00:00:00Z', paidDate: null },
  { id: '3', invoiceNo: 'INV-2026-0041', amount: 49.99, status: 'paid', dueDate: '2026-03-01T00:00:00Z', paidDate: '2026-02-28T00:00:00Z' },
]

// ==========================================
// Helper Functions
// ==========================================

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ==========================================
// Main Selfcare Portal Component
// ==========================================

export function SelfcarePortal() {
  const [activeSection, setActiveSection] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: DEMO_USER.fullName,
    email: DEMO_USER.email,
    phone: DEMO_USER.phone,
    address: DEMO_USER.address,
    city: DEMO_USER.city,
    state: DEMO_USER.state,
    country: DEMO_USER.country,
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const usagePercent = (DEMO_USER.dataUsed / DEMO_USER.dataLimit) * 100

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully (demo)')
    setEditMode(false)
  }

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    toast.success('Password changed successfully (demo)')
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const handleUploadDocument = () => {
    toast.info('Document upload simulated (demo)')
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Demo Notice */}
      <Card className="border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              This is a <strong>demo/simulated</strong> selfcare portal view. Data shown below is mock data for demonstration purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group cursor-pointer">
              <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-gray-900 shadow-lg">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {DEMO_USER.fullName.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{DEMO_USER.fullName}</h2>
              <p className="text-sm text-muted-foreground">@{DEMO_USER.username}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {DEMO_USER.status}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <CreditCard className="h-3 w-3" />
                  {DEMO_USER.plan}
                </Badge>
                <Badge variant="outline" className="gap-1 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800">
                  <Shield className="h-3 w-3" />
                  KYC Verified
                </Badge>
                {DEMO_USER.online && (
                  <Badge variant="outline" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                    <Wifi className="h-3 w-3" />
                    Online
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'subscription', label: 'My Subscription', icon: CreditCard },
          { id: 'password', label: 'Change Password', icon: Lock },
          { id: 'sessions', label: 'My Sessions', icon: Activity },
          { id: 'invoices', label: 'My Invoices', icon: FileText },
          { id: 'documents', label: 'Upload Documents', icon: Upload },
          { id: 'status', label: 'Service Status', icon: Wifi },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeSection === tab.id ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setActiveSection(tab.id)}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Section Content */}
      {activeSection === 'profile' && (
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                My Profile
              </CardTitle>
              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
              >
                {editMode ? 'Save Changes' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                {editMode ? (
                  <Input value={profileData.fullName} onChange={(e) => setProfileData((d) => ({ ...d, fullName: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.fullName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                {editMode ? (
                  <Input type="email" value={profileData.email} onChange={(e) => setProfileData((d) => ({ ...d, email: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                {editMode ? (
                  <Input value={profileData.phone} onChange={(e) => setProfileData((d) => ({ ...d, phone: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <p className="text-sm p-2 rounded-md bg-muted/50 text-muted-foreground">{DEMO_USER.username} (cannot change)</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                {editMode ? (
                  <Input value={profileData.city} onChange={(e) => setProfileData((d) => ({ ...d, city: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                {editMode ? (
                  <Input value={profileData.state} onChange={(e) => setProfileData((d) => ({ ...d, state: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                {editMode ? (
                  <Input value={profileData.country} onChange={(e) => setProfileData((d) => ({ ...d, country: e.target.value }))} />
                ) : (
                  <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.country}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              {editMode ? (
                <Input value={profileData.address} onChange={(e) => setProfileData((d) => ({ ...d, address: e.target.value }))} />
              ) : (
                <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.address}</p>
              )}
            </div>
            {editMode && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveProfile}>Save Changes</Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === 'subscription' && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Current Plan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold">{DEMO_USER.plan}</h3>
                  <p className="text-sm text-muted-foreground">Monthly subscription</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">$49.99</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <ArrowDown className="h-5 w-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                  <p className="text-sm font-bold">{DEMO_USER.speedDown} Mbps</p>
                  <p className="text-[10px] text-muted-foreground">Download</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <ArrowUp className="h-5 w-5 mx-auto text-sky-600 dark:text-sky-400 mb-1" />
                  <p className="text-sm font-bold">{DEMO_USER.speedUp} Mbps</p>
                  <p className="text-[10px] text-muted-foreground">Upload</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Globe className="h-5 w-5 mx-auto text-violet-600 dark:text-violet-400 mb-1" />
                  <p className="text-sm font-bold">{DEMO_USER.dataLimit} GB</p>
                  <p className="text-[10px] text-muted-foreground">Data Limit</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Zap className="h-5 w-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                  <p className="text-sm font-bold">1</p>
                  <p className="text-[10px] text-muted-foreground">Concurrent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Usage This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Data Usage</span>
                  <span className="font-medium tabular-nums">{DEMO_USER.dataUsed} / {DEMO_USER.dataLimit} GB</span>
                </div>
                <Progress value={usagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{DEMO_USER.dataLimit - DEMO_USER.dataUsed} GB remaining</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Joined:</span>{' '}
                  <span className="font-medium">{format(new Date(DEMO_USER.joinedDate), 'MMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expires:</span>{' '}
                  <span className="font-medium">{format(new Date(DEMO_USER.expiryDate), 'MMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Next Billing:</span>{' '}
                  <span className="font-medium">{format(new Date(DEMO_USER.nextBilling), 'MMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Auto-Renew:</span>{' '}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Yes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'password' && (
        <Card className="animate-fade-in-up max-w-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData((d) => ({ ...d, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((d) => ({ ...d, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm New Password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((d) => ({ ...d, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <Button size="sm" onClick={handleChangePassword}>Change Password</Button>
          </CardContent>
        </Card>
      )}

      {activeSection === 'sessions' && (
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              My Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_SESSIONS.map((session) => (
              <div key={session.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${session.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : ''}`}
                    >
                      {session.status === 'active' ? (
                        <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-pulse" /> Active</span>
                      ) : 'Stopped'}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{session.ip}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{session.nas}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Start: </span>
                    {format(new Date(session.startTime), 'MMM dd HH:mm')}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    {formatDuration(session.duration)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Download: </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{session.dataDown}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Upload: </span>
                    <span className="text-sky-600 dark:text-sky-400 font-medium">{session.dataUp}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeSection === 'invoices' && (
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_INVOICES.map((inv) => (
              <div key={inv.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium font-mono">{inv.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(new Date(inv.dueDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">${inv.amount.toFixed(2)}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast.info('Invoice download simulated (demo)')}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeSection === 'documents' && (
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30 cursor-pointer" onClick={handleUploadDocument}>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Click to upload documents</p>
              <p className="text-xs text-muted-foreground mt-1">ID Proof, Address Proof, Photo, Contract</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Required documents for KYC verification:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> ID Proof
                </Badge>
                <Badge variant="outline" className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> Address Proof
                </Badge>
                <Badge variant="outline" className="text-xs gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3 w-3" /> Photo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'status' && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-3 w-3 rounded-full ${DEMO_USER.online ? 'bg-emerald-500 status-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">
                  {DEMO_USER.online ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {DEMO_USER.online && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Current IP</p>
                    <p className="font-mono font-medium">{DEMO_USER.currentIp}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Session Duration</p>
                    <p className="font-medium">{formatDuration(Math.floor((Date.now() - new Date(DEMO_USER.sessionStart!).getTime()) / 1000))}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bandwidth Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4" />
                Bandwidth Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <ArrowDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Download
                  </span>
                  <span className="font-medium tabular-nums">2.3 GB / Unlimited</span>
                </div>
                <Progress value={23} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <ArrowUp className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    Upload
                  </span>
                  <span className="font-medium tabular-nums">0.8 GB / Unlimited</span>
                </div>
                <Progress value={8} className="h-2" />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Plan Speed:</span>{' '}
                  <span className="font-medium">{DEMO_USER.speedDown}/{DEMO_USER.speedUp} Mbps</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Usage:</span>{' '}
                  <span className="font-medium">{DEMO_USER.monthlyUsage} GB this month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
