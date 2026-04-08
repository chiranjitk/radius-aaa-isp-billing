'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  UserPlus,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
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
  MonitorSmartphone,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  Send,
  ChevronRight,
  Loader2,
  Package,
  BadgeCheck,
  FileUp,
  FileBadge2,
  Handshake,
  CircleDot,
  Check,
  X,
  RefreshCw,
  Landmark,
  Contact,
  Search,
  Plus,
  Star,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
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
  zip: string
  country: string
  plan: string
  status: string
  kycStatus: string
  ipType: string
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

interface DemoDocument {
  id: string
  docType: string
  docName: string
  fileName: string
  status: 'pending' | 'approved' | 'rejected'
  uploadedAt: string
  fileSize: string
}

interface DemoInvoice {
  id: string
  invoiceNo: string
  amount: number
  tax: number
  total: number
  status: 'paid' | 'pending' | 'overdue'
  dueDate: string
  paidDate: string | null
  planName: string
}

interface DemoSession {
  id: string
  startTime: string
  stopTime: string | null
  duration: number
  dataDown: string
  dataUp: string
  nas: string
  ip: string
  status: 'active' | 'stopped'
}

interface FAQ {
  question: string
  answer: string
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
  company: 'Doe Technologies',
  address: '123 Main Street, Suite 500',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  country: 'United States',
  plan: 'Fiber 100 Mbps',
  status: 'active',
  kycStatus: 'verified',
  ipType: 'dynamic',
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

const DEMO_SESSIONS: DemoSession[] = [
  { id: '1', startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), stopTime: null, duration: 10800, dataDown: '2.3 GB', dataUp: '0.8 GB', nas: 'BR-NAS-01', ip: '10.0.1.45', status: 'active' },
  { id: '2', startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), stopTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), duration: 14400, dataDown: '5.1 GB', dataUp: '1.2 GB', nas: 'BR-NAS-02', ip: '10.0.1.78', status: 'stopped' },
  { id: '3', startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), stopTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), duration: 7200, dataDown: '1.8 GB', dataUp: '0.4 GB', nas: 'BR-NAS-01', ip: '10.0.1.92', status: 'stopped' },
  { id: '4', startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), stopTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(), duration: 21600, dataDown: '8.7 GB', dataUp: '2.1 GB', nas: 'BR-NAS-03', ip: '10.0.2.15', status: 'stopped' },
  { id: '5', startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), stopTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), duration: 3600, dataDown: '0.9 GB', dataUp: '0.2 GB', nas: 'BR-NAS-01', ip: '10.0.1.103', status: 'stopped' },
]

const DEMO_DOCUMENTS: DemoDocument[] = [
  { id: '1', docType: 'id_proof', docName: 'National ID Card', fileName: 'john_doe_national_id.pdf', status: 'approved', uploadedAt: '2025-01-15T10:30:00Z', fileSize: '2.4 MB' },
  { id: '2', docType: 'address_proof', docName: 'Utility Bill', fileName: 'utility_bill_jan_2025.pdf', status: 'approved', uploadedAt: '2025-01-15T10:35:00Z', fileSize: '1.1 MB' },
  { id: '3', docType: 'photo', docName: 'Profile Photo', fileName: 'john_doe_photo.jpg', status: 'approved', uploadedAt: '2025-01-15T10:38:00Z', fileSize: '850 KB' },
  { id: '4', docType: 'contract', docName: 'Service Agreement', fileName: 'service_agreement_signed.pdf', status: 'pending', uploadedAt: '2025-01-15T10:40:00Z', fileSize: '3.2 MB' },
]

const DEMO_INVOICES: DemoInvoice[] = [
  { id: '1', invoiceNo: 'INV-2026-0043', amount: 49.99, tax: 4.00, total: 53.99, status: 'pending', dueDate: '2026-05-01T00:00:00Z', paidDate: null, planName: 'Fiber 100 Mbps' },
  { id: '2', invoiceNo: 'INV-2026-0042', amount: 49.99, tax: 4.00, total: 53.99, status: 'paid', dueDate: '2026-04-01T00:00:00Z', paidDate: '2026-03-29T00:00:00Z', planName: 'Fiber 100 Mbps' },
  { id: '3', invoiceNo: 'INV-2026-0041', amount: 49.99, tax: 4.00, total: 53.99, status: 'paid', dueDate: '2026-03-01T00:00:00Z', paidDate: '2026-02-28T00:00:00Z', planName: 'Fiber 100 Mbps' },
  { id: '4', invoiceNo: 'INV-2026-0040', amount: 49.99, tax: 4.00, total: 53.99, status: 'overdue', dueDate: '2026-02-01T00:00:00Z', paidDate: null, planName: 'Fiber 100 Mbps' },
]

const DEMO_PAYMENTS = [
  { id: '1', paymentNo: 'PAY-2026-0089', amount: 53.99, method: 'Online Payment', status: 'completed', date: '2026-03-29T00:00:00Z', invoiceNo: 'INV-2026-0042' },
  { id: '2', paymentNo: 'PAY-2026-0078', amount: 53.99, method: 'Credit Card', status: 'completed', date: '2026-02-28T00:00:00Z', invoiceNo: 'INV-2026-0041' },
]

const FAQS: FAQ[] = [
  { question: 'How do I reset my password?', answer: 'Go to My Account tab and use the Change Password section. Enter your current password and set a new one. If you forgot your password, contact support.' },
  { question: 'What happens when I reach my data limit?', answer: 'When you reach your monthly data limit, your speed will be reduced to 1 Mbps for the remainder of the billing cycle. You can upgrade your plan at any time for more data.' },
  { question: 'How can I upgrade my internet plan?', answer: 'Navigate to My Services tab and click "Upgrade Plan". You can compare available plans and select a higher tier. The upgrade takes effect immediately with prorated billing.' },
  { question: 'How do I check my KYC verification status?', answer: 'Go to the KYC Verification tab to see your current status and upload any required documents. Verification typically takes 1-2 business days.' },
  { question: 'How can I pay my bill?', answer: 'Go to the Billing tab and click "Pay Now" on any pending invoice. We accept credit cards, debit cards, bank transfers, and online payment methods.' },
  { question: 'What is my IP assignment type?', answer: 'By default, you receive a dynamic IP address that may change each session. You can request a static IP through the KYC verification process for an additional fee.' },
  { question: 'How do I submit a support ticket?', answer: 'Go to the Support tab, fill out the ticket form with subject, category, and description. Our team will respond within 24 hours.' },
]

// ==========================================
// Tab definitions
// ==========================================

const TABS = [
  { id: 'register', label: 'Register', icon: UserPlus },
  { id: 'account', label: 'My Account', icon: User },
  { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck },
  { id: 'services', label: 'My Services', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'support', label: 'Support', icon: MessageSquare },
] as const

type TabId = (typeof TABS)[number]['id']

// ==========================================
// Helpers
// ==========================================

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getKycColor(status: string) {
  switch (status) {
    case 'verified': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'submitted': return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800'
    default: return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  }
}

function getInvoiceStatusColor(status: string) {
  switch (status) {
    case 'paid': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800'
    default: return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  }
}

function getDocIcon(docType: string) {
  switch (docType) {
    case 'id_proof': return FileBadge2
    case 'address_proof': return Landmark
    case 'photo': return Camera
    case 'contract': return Handshake
    default: return FileUp
  }
}

function getDocStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <Badge variant="outline" className="text-[10px] gap-1 chip bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"><Check className="h-2.5 w-2.5" />Approved</Badge>
    case 'rejected':
      return <Badge variant="outline" className="text-[10px] gap-1 chip bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"><X className="h-2.5 w-2.5" />Rejected</Badge>
    default:
      return <Badge variant="outline" className="text-[10px] gap-1 chip bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"><Clock className="h-2.5 w-2.5" />Pending</Badge>
  }
}

// ==========================================
// KYC Progress Steps Component
// ==========================================

function KycProgressSteps({ status }: { status: string }) {
  const steps = [
    { label: 'Submit Documents', icon: FileUp },
    { label: 'Under Review', icon: Search },
    { label: 'Verified', icon: CheckCircle2 },
  ]
  const currentIndex = status === 'pending' ? 0 : status === 'submitted' ? 1 : status === 'verified' ? 2 : -1

  return (
    <div className="flex items-center justify-between w-full max-w-lg mx-auto">
      {steps.map((step, idx) => {
        const isCompleted = idx <= currentIndex && currentIndex >= 0
        const isCurrent = idx === currentIndex
        return (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-muted border-muted-foreground/20 text-muted-foreground'}`}>
                {isCompleted && idx < currentIndex ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              <span className={`text-[11px] font-medium text-center ${isCurrent ? 'text-emerald-600 dark:text-emerald-400' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all ${idx < currentIndex ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ==========================================
// Registration Tab
// ==========================================

function RegistrationTab() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    planId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans-selfcare'],
    queryFn: () => fetch('/api/plans?status=active&limit=50').then(r => r.ok ? r.json() : Promise.reject(r)),
    staleTime: 5 * 60 * 1000,
  })

  const plans = plansData?.plans?.filter((p: { status: string }) => p.status === 'active') || []

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.username.trim()) newErrors.username = 'Username is required'
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.planId) newErrors.planId = 'Please select a plan'
    if (!agreeTerms) newErrors.terms = 'You must agree to the terms and conditions'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, agreeTerms])

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company || undefined,
          address: formData.address || undefined,
          planId: formData.planId || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setRegistered(true)
        toast.success('Registration submitted successfully! Please wait for admin approval.')
      } else {
        toast.error(data.error || 'Registration failed. Please try again.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  if (registered) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-8">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold">Registration Submitted!</h3>
        <p className="text-sm text-muted-foreground">
          Thank you for registering, <strong>{formData.fullName}</strong>! Your account is pending admin approval.
          You will receive a confirmation email at <strong>{formData.email}</strong>.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-1">
          <p><span className="text-muted-foreground">Username:</span> <strong>{formData.username}</strong></p>
          <p><span className="text-muted-foreground">Plan:</span> <strong>{plans.find((p: { id: string }) => p.id === formData.planId)?.name || 'N/A'}</strong></p>
          <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending Approval</Badge></p>
        </div>
        <Button variant="outline" onClick={() => { setRegistered(false); setFormData({ username: '', password: '', confirmPassword: '', fullName: '', email: '', phone: '', company: '', address: '', city: '', state: '', zip: '', country: '', planId: '' }); setAgreeTerms(false) }}>
          Register Another Account
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold">Create Your Account</h3>
        <p className="text-sm text-muted-foreground">Sign up for internet service in just a few steps</p>
      </div>

      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardContent className="p-6 space-y-5">
          {/* Plan Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Choose a Plan <span className="text-red-500">*</span></Label>
            {plansLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-28 rounded-lg skeleton-shimmer" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((plan: { id: string; name: string; description?: string; price: number; currency: string; speedDown?: number | null; speedUp?: number | null; dataLimit?: number | null; billingCycle: string; _count?: { subscriptions: number } }) => (
                  <div
                    key={plan.id}
                    onClick={() => updateField('planId', plan.id)}
                    className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                      formData.planId === plan.id
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    {formData.planId === plan.id && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-emerald-500 text-white text-[10px] gap-0.5"><Check className="h-2.5 w-2.5" />Selected</Badge>
                      </div>
                    )}
                    <h4 className="font-semibold text-sm">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description || `${plan.billingCycle} billing`}</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${plan.price}</span>
                      <span className="text-[10px] text-muted-foreground">/{plan.billingCycle === 'monthly' ? 'mo' : plan.billingCycle}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {plan.speedDown && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><ArrowDown className="h-2.5 w-2.5 text-emerald-500" />{plan.speedDown} Kbps</span>}
                      {plan.speedUp && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><ArrowUp className="h-2.5 w-2.5 text-sky-500" />{plan.speedUp} Kbps</span>}
                      {plan.dataLimit ? <span className="text-[10px] text-muted-foreground">{Math.round(plan.dataLimit / 1024)} GB</span> : <span className="text-[10px] text-emerald-600">Unlimited</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.planId && <p className="text-xs text-red-500">{errors.planId}</p>}
          </div>

          <Separator />

          {/* Account Info */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Account Information</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Username <span className="text-red-500">*</span></Label>
              <Input placeholder="Choose a username" value={formData.username} onChange={e => updateField('username', e.target.value)} className="h-9" />
              {errors.username && <p className="text-[11px] text-red-500">{errors.username}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={formData.password} onChange={e => updateField('password', e.target.value)} className="h-9 pr-9" />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {errors.password && <p className="text-[11px] text-red-500">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirm Password <span className="text-red-500">*</span></Label>
              <Input type="password" placeholder="Re-enter password" value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} className="h-9" />
              {errors.confirmPassword && <p className="text-[11px] text-red-500">{errors.confirmPassword}</p>}
            </div>
          </div>

          <Separator />

          {/* Personal Info */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Personal Information</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
              <Input placeholder="John Doe" value={formData.fullName} onChange={e => updateField('fullName', e.target.value)} className="h-9" />
              {errors.fullName && <p className="text-[11px] text-red-500">{errors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
              <Input type="email" placeholder="john@example.com" value={formData.email} onChange={e => updateField('email', e.target.value)} className="h-9" />
              {errors.email && <p className="text-[11px] text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
              <Input placeholder="+1 234 567 8900" value={formData.phone} onChange={e => updateField('phone', e.target.value)} className="h-9" />
              {errors.phone && <p className="text-[11px] text-red-500">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company (Optional)</Label>
              <Input placeholder="Company name" value={formData.company} onChange={e => updateField('company', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input placeholder="United States" value={formData.country} onChange={e => updateField('country', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input placeholder="123 Main Street" value={formData.address} onChange={e => updateField('address', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input placeholder="New York" value={formData.city} onChange={e => updateField('city', e.target.value)} className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input placeholder="NY" value={formData.state} onChange={e => updateField('state', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ZIP Code</Label>
                <Input placeholder="10001" value={formData.zip} onChange={e => updateField('zip', e.target.value)} className="h-9" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Terms */}
          <div className="flex items-start gap-3">
            <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(v) => { setAgreeTerms(v === true); if (errors.terms) setErrors(prev => { const n = { ...prev }; delete n.terms; return n }) }} />
            <div className="space-y-0.5">
              <Label htmlFor="terms" className="text-xs cursor-pointer leading-relaxed">
                I agree to the <span className="text-emerald-600 dark:text-emerald-400 font-medium underline cursor-pointer">Terms of Service</span> and <span className="text-emerald-600 dark:text-emerald-400 font-medium underline cursor-pointer">Privacy Policy</span>
              </Label>
              {errors.terms && <p className="text-[11px] text-red-500">{errors.terms}</p>}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Account...</> : <><UserPlus className="h-4 w-4 mr-2" />Create Account</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ==========================================
// My Account Tab
// ==========================================

function AccountTab() {
  const [editMode, setEditMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: DEMO_USER.fullName,
    email: DEMO_USER.email,
    phone: DEMO_USER.phone,
    company: DEMO_USER.company,
    address: DEMO_USER.address,
    city: DEMO_USER.city,
    state: DEMO_USER.state,
    zip: DEMO_USER.zip,
    country: DEMO_USER.country,
  })
  const [passwordData, setPasswordData] = useState({ current: '', newPw: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})

  const handleSaveProfile = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setEditMode(false)
    toast.success('Profile updated successfully')
  }

  const handleChangePassword = () => {
    const errs: Record<string, string> = {}
    if (!passwordData.current) errs.current = 'Current password is required'
    if (!passwordData.newPw) errs.newPw = 'New password is required'
    else if (passwordData.newPw.length < 6) errs.newPw = 'Must be at least 6 characters'
    if (passwordData.newPw !== passwordData.confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length > 0) { setPwErrors(errs); return }
    setPwErrors({})
    toast.success('Password changed successfully')
    setPasswordData({ current: '', newPw: '', confirm: '' })
  }

  const updateField = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const initials = DEMO_USER.fullName.split(' ').map(n => n[0]).join('')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden border-slate-200/60 dark:border-slate-700/40 inset-card">
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-slate-900 shadow-lg">
                <AvatarFallback className="bg-emerald-600 text-white text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => toast.info('Photo upload simulated (demo)')}>
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold">{DEMO_USER.fullName}</h3>
              <p className="text-sm text-muted-foreground">@{DEMO_USER.username}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 text-[10px]">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{DEMO_USER.status}
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]"><Package className="h-3 w-3" />{DEMO_USER.plan}</Badge>
                <Badge variant="outline" className={`gap-1 text-[10px] ${getKycColor(DEMO_USER.kycStatus)}`}><ShieldCheck className="h-3 w-3" />KYC {DEMO_USER.kycStatus}</Badge>
                <Badge variant="outline" className="gap-1 text-[10px]"><Globe className="h-3 w-3" />IP: {DEMO_USER.ipType}</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Details */}
      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Profile Information
            </CardTitle>
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              className={editMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs' : 'text-xs'}
              onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
              disabled={saving}
            >
              {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving...</> : editMode ? 'Save Changes' : 'Edit Profile'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Username</Label>
              <p className="text-sm p-2 rounded-md bg-muted/50 font-mono">{DEMO_USER.username}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account Status</Label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <div className={`h-2 w-2 rounded-full ${DEMO_USER.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium capitalize">{DEMO_USER.status}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              {editMode ? <Input value={profileData.fullName} onChange={e => updateField('fullName', e.target.value)} className="h-9" /> : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              {editMode ? <Input type="email" value={profileData.email} onChange={e => updateField('email', e.target.value)} className="h-9" /> : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              {editMode ? <Input value={profileData.phone} onChange={e => updateField('phone', e.target.value)} className="h-9" /> : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company</Label>
              {editMode ? <Input value={profileData.company} onChange={e => updateField('company', e.target.value)} className="h-9" /> : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.company || '—'}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Address</Label>
              {editMode ? <Input value={profileData.address} onChange={e => updateField('address', e.target.value)} className="h-9" /> : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.address}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City</Label>
              {editMode ? <Input value={profileData.city} onChange={e => updateField('city', e.target.value)} className="h-9" /> : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.city}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State / ZIP</Label>
              {editMode ? (
                <div className="flex gap-2">
                  <Input value={profileData.state} onChange={e => updateField('state', e.target.value)} className="h-9" placeholder="State" />
                  <Input value={profileData.zip} onChange={e => updateField('zip', e.target.value)} className="h-9 w-24" placeholder="ZIP" />
                </div>
              ) : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.state}, {profileData.zip}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Country</Label>
              {editMode ? <Input value={profileData.country} onChange={e => updateField('country', e.target.value)} className="h-9" /> : <p className="text-sm p-2 rounded-md bg-muted/50">{profileData.country}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Member Since</Label>
              <p className="text-sm p-2 rounded-md bg-muted/50">{format(new Date(DEMO_USER.joinedDate), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          {editMode && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveProfile} disabled={saving}>Save Changes</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditMode(false) }}>Cancel</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label className="text-xs">Current Password</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={passwordData.current} onChange={e => { setPasswordData(d => ({ ...d, current: e.target.value })); if (pwErrors.current) setPwErrors(p => { const n = { ...p }; delete n.current; return n }) }} placeholder="Enter current password" className="h-9 pr-9" />
              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {pwErrors.current && <p className="text-[11px] text-red-500">{pwErrors.current}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New Password</Label>
            <Input type="password" value={passwordData.newPw} onChange={e => { setPasswordData(d => ({ ...d, newPw: e.target.value })); if (pwErrors.newPw) setPwErrors(p => { const n = { ...p }; delete n.newPw; return n }) }} placeholder="Enter new password" className="h-9" />
            {pwErrors.newPw && <p className="text-[11px] text-red-500">{pwErrors.newPw}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirm New Password</Label>
            <Input type="password" value={passwordData.confirm} onChange={e => { setPasswordData(d => ({ ...d, confirm: e.target.value })); if (pwErrors.confirm) setPwErrors(p => { const n = { ...p }; delete n.confirm; return n }) }} placeholder="Confirm new password" className="h-9" />
            {pwErrors.confirm && <p className="text-[11px] text-red-500">{pwErrors.confirm}</p>}
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleChangePassword}>Change Password</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ==========================================
// KYC Verification Tab
// ==========================================

function KycTab() {
  const [documents, setDocuments] = useState<DemoDocument[]>(DEMO_DOCUMENTS)
  const [kycStatus, setKycStatus] = useState(DEMO_USER.kycStatus)
  const [uploading, setUploading] = useState<string | null>(null)

  const handleUpload = (docType: string) => {
    setUploading(docType)
    setTimeout(() => {
      const newDoc: DemoDocument = {
        id: `doc_${Date.now()}`,
        docType,
        docName: docType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        fileName: `uploaded_${docType}_${Date.now()}.pdf`,
        status: 'pending',
        uploadedAt: new Date().toISOString(),
        fileSize: '1.5 MB',
      }
      setDocuments(prev => {
        const filtered = prev.filter(d => d.docType !== docType)
        return [...filtered, newDoc]
      })
      setKycStatus('submitted')
      setUploading(null)
      toast.success(`${newDoc.docName} uploaded successfully`)
    }, 1500)
  }

  const kycIcon = kycStatus === 'verified' ? ShieldCheck : kycStatus === 'rejected' ? ShieldX : kycStatus === 'submitted' ? Shield : ShieldAlert
  const kycIconColor = kycStatus === 'verified' ? 'text-emerald-600 dark:text-emerald-400' : kycStatus === 'rejected' ? 'text-red-600 dark:text-red-400' : kycStatus === 'submitted' ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'
  const KycIcon = kycIcon

  const docTypes = [
    { type: 'id_proof', label: 'ID Proof', description: 'Passport, National ID, or Driving License', subtypes: ['Passport', 'National ID', 'Driving License'] },
    { type: 'address_proof', label: 'Address Proof', description: 'Utility bill, bank statement, or lease agreement', subtypes: ['Utility Bill', 'Bank Statement', 'Lease Agreement'] },
    { type: 'photo', label: 'Profile Photo', description: 'Clear passport-size photo for verification', subtypes: ['Passport Photo', 'Selfie with ID'] },
    { type: 'contract', label: 'Service Agreement', description: 'Signed service contract / agreement', subtypes: ['Service Contract', 'Agreement'] },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* KYC Status Overview */}
      <Card className={`border-slate-200/60 dark:border-slate-700/40 inset-card ${kycStatus === 'verified' ? 'border-emerald-200 dark:border-emerald-800' : ''}`}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto ${kycStatus === 'verified' ? 'bg-emerald-100 dark:bg-emerald-950' : kycStatus === 'submitted' ? 'bg-sky-100 dark:bg-sky-950' : kycStatus === 'rejected' ? 'bg-red-100 dark:bg-red-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
              <KycIcon className={`h-7 w-7 ${kycIconColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold">KYC Verification</h3>
              <Badge variant="outline" className={`mt-1 text-xs ${getKycColor(kycStatus)}`}>
                {kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {kycStatus === 'verified' && 'Your identity has been verified. You have full access to all services.'}
              {kycStatus === 'submitted' && 'Your documents are being reviewed. This typically takes 1-2 business days.'}
              {kycStatus === 'rejected' && 'Some documents were rejected. Please re-upload the required documents.'}
              {kycStatus === 'pending' && 'Please upload the required documents to complete your identity verification.'}
            </p>
          </div>
          <div className="mt-6">
            <KycProgressSteps status={kycStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Required Documents</h3>
        {docTypes.map(dt => {
          const existingDoc = documents.find(d => d.docType === dt.type)
          const DocIcon = getDocIcon(dt.type)

          return (
            <Card key={dt.type} className="border-slate-200/60 dark:border-slate-700/40 inset-card hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                    <DocIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium">{dt.label}</h4>
                        <p className="text-xs text-muted-foreground">{dt.description}</p>
                      </div>
                      {existingDoc && getDocStatusBadge(existingDoc.status)}
                    </div>

                    {existingDoc && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
                        <span className="font-mono truncate">{existingDoc.fileName}</span>
                        <span className="shrink-0">{existingDoc.fileSize}</span>
                        <span className="shrink-0">{format(new Date(existingDoc.uploadedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    )}

                    {!existingDoc || existingDoc.status === 'rejected' ? (
                      <div
                        className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-all hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 ${uploading === dt.type ? 'border-emerald-400 bg-emerald-50/30' : ''}`}
                        onClick={() => handleUpload(dt.type)}
                      >
                        {uploading === dt.type ? (
                          <div className="flex items-center justify-center gap-2 text-emerald-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-medium">Uploading...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Upload className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              {existingDoc?.status === 'rejected' ? 'Re-upload document' : 'Upload document'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {existingDoc.status === 'pending' && (
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleUpload(dt.type)}>
                            <RefreshCw className="h-3 w-3 mr-1" />Replace
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toast.info('Document preview simulated')}>
                          <Eye className="h-3 w-3 mr-1" />View
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ==========================================
// My Services Tab
// ==========================================

function ServicesTab() {
  const usagePercent = (DEMO_USER.dataUsed / DEMO_USER.dataLimit) * 100

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Current Plan */}
      <Card className="border-emerald-200/60 dark:border-emerald-800/40 overflow-hidden inset-card">
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-emerald-600 text-white text-[10px]">Active Plan</Badge>
                {DEMO_USER.online && (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 text-[10px]">
                    <Wifi className="h-2.5 w-2.5" />Online
                  </Badge>
                )}
              </div>
              <h3 className="text-xl font-bold">{DEMO_USER.plan}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Monthly fiber internet subscription</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">$49.99</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          </div>
        </div>
        <CardContent className="p-5">
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
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs ripple" onClick={() => toast.info('Plan upgrade page simulated')}>
              <TrendingUp className="h-3 w-3 mr-1" />Upgrade Plan
            </Button>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => toast.info('Plan renewal simulated')}>
              <RefreshCw className="h-3 w-3 mr-1" />Renew Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />Data Usage</span>
              <span className="font-medium tabular-nums">{DEMO_USER.dataUsed} / {DEMO_USER.dataLimit} GB</span>
            </div>
            <Progress value={usagePercent} className="h-2.5" />
            <p className="text-xs text-muted-foreground">{(DEMO_USER.dataLimit - DEMO_USER.dataUsed).toFixed(1)} GB remaining this cycle</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />Time Used</span>
              <span className="font-medium tabular-nums">142h 30m this month</span>
            </div>
            <Progress value={62} className="h-2.5" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5"><MonitorSmartphone className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />Bandwidth</span>
              <span className="font-medium tabular-nums">3.1 GB today</span>
            </div>
            <Progress value={31} className="h-2.5" />
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><span className="text-muted-foreground">Joined:</span><br /><span className="font-medium">{format(new Date(DEMO_USER.joinedDate), 'MMM dd, yyyy')}</span></div>
            <div><span className="text-muted-foreground">Expires:</span><br /><span className="font-medium">{format(new Date(DEMO_USER.expiryDate), 'MMM dd, yyyy')}</span></div>
            <div><span className="text-muted-foreground">Next Billing:</span><br /><span className="font-medium">{format(new Date(DEMO_USER.nextBilling), 'MMM dd, yyyy')}</span></div>
            <div><span className="text-muted-foreground">Auto-Renew:</span><br /><span className="font-medium text-emerald-600 dark:text-emerald-400">Enabled</span></div>
          </div>

          {DEMO_USER.online && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 flex items-center gap-3 text-sm border border-emerald-200/60 dark:border-emerald-800/40">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Connected</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">IP: <span className="font-mono">{DEMO_USER.currentIp}</span></span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">Session: <span className="font-mono">{formatDuration(Math.floor((Date.now() - new Date(DEMO_USER.sessionStart!).getTime()) / 1000))}</span></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Recent Sessions
          </CardTitle>
          <CardDescription>Last 5 sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEMO_SESSIONS.map(session => (
            <div key={session.id} className="rounded-lg border p-4 space-y-2 hover:bg-muted/20 transition-colors table-row-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${session.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : ''}`}>
                    {session.status === 'active' ? (
                      <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Active</span>
                    ) : 'Stopped'}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{session.ip}</span>
                </div>
                <span className="text-xs text-muted-foreground">{session.nas}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span className="text-muted-foreground">Start: </span>{format(new Date(session.startTime), 'MMM dd HH:mm')}</div>
                <div><span className="text-muted-foreground">Duration: </span>{formatDuration(session.duration)}</div>
                <div><span className="text-muted-foreground">Download: </span><span className="text-emerald-600 dark:text-emerald-400 font-medium">{session.dataDown}</span></div>
                <div><span className="text-muted-foreground">Upload: </span><span className="text-sky-600 dark:text-sky-400 font-medium">{session.dataUp}</span></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ==========================================
// Billing Tab
// ==========================================

function BillingTab() {
  const [activeBillingSub, setActiveBillingSub] = useState<'invoices' | 'payments'>('invoices')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Billing Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card hover-lift">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">$107.98</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card hover-lift">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Paid This Year</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">$599.88</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 dark:border-slate-700/40 hidden sm:block inset-card hover-lift">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Current Plan</p>
            <p className="text-lg font-bold">$49.99<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices / Payments toggle */}
      <div className="flex gap-2">
        <Button variant={activeBillingSub === 'invoices' ? 'default' : 'outline'} size="sm" className={activeBillingSub === 'invoices' ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs' : 'text-xs'} onClick={() => setActiveBillingSub('invoices')}>
          <FileText className="h-3.5 w-3.5 mr-1" />Invoices
        </Button>
        <Button variant={activeBillingSub === 'payments' ? 'default' : 'outline'} size="sm" className={activeBillingSub === 'payments' ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs' : 'text-xs'} onClick={() => setActiveBillingSub('payments')}>
          <Landmark className="h-3.5 w-3.5 mr-1" />Payment History
        </Button>
      </div>

      {activeBillingSub === 'invoices' && (
        <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_INVOICES.map(inv => (
              <div key={inv.id} className="rounded-lg border p-4 hover:bg-muted/20 transition-colors table-row-hover">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono">{inv.invoiceNo}</p>
                      <Badge variant="outline" className={`text-[10px] ${getInvoiceStatusColor(inv.status)}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inv.planName} &middot; Due: {format(new Date(inv.dueDate), 'MMM dd, yyyy')}
                      {inv.paidDate && ` &middot; Paid: ${format(new Date(inv.paidDate), 'MMM dd, yyyy')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-bold">${inv.total.toFixed(2)}</p>
                      {inv.tax > 0 && <p className="text-[10px] text-muted-foreground">incl. ${inv.tax.toFixed(2)} tax</p>}
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast.info('Invoice download simulated')}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {inv.status === 'pending' || inv.status === 'overdue' ? (
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 ripple" onClick={() => toast.success('Payment initiated (simulated)')}>
                          Pay Now
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8 text-xs px-3" disabled>Paid</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeBillingSub === 'payments' && (
        <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_PAYMENTS.map(pay => (
              <div key={pay.id} className="rounded-lg border p-4 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono">{pay.paymentNo}</p>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800">
                        <Check className="h-2.5 w-2.5 mr-0.5" />Completed
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pay.method} &middot; {format(new Date(pay.date), 'MMM dd, yyyy')} &middot; Invoice: {pay.invoiceNo}
                    </p>
                  </div>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">${pay.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==========================================
// Support Tab
// ==========================================

function SupportTab() {
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketCategory, setTicketCategory] = useState('')
  const [ticketDescription, setTicketDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketCategory || !ticketDescription.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1000))
    setSubmitting(false)
    setSubmitted(true)
    toast.success('Support ticket submitted successfully! We will respond within 24 hours.')
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-8">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold">Ticket Submitted!</h3>
        <p className="text-sm text-muted-foreground">
          Your support ticket has been created. Our team will get back to you within 24 hours.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-1">
          <p><span className="text-muted-foreground">Ticket ID:</span> <strong>TKT-{Date.now().toString().slice(-6)}</strong></p>
          <p><span className="text-muted-foreground">Subject:</span> <strong>{ticketSubject}</strong></p>
          <p><span className="text-muted-foreground">Category:</span> <strong>{ticketCategory}</strong></p>
          <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Open</Badge></p>
        </div>
        <Button variant="outline" onClick={() => { setSubmitted(false); setTicketSubject(''); setTicketCategory(''); setTicketDescription('') }}>
          Submit Another Ticket
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Ticket Form */}
      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Submit a Support Ticket
          </CardTitle>
          <CardDescription>Describe your issue and our team will assist you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Subject <span className="text-red-500">*</span></Label>
              <Input placeholder="Brief description of your issue" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category <span className="text-red-500">*</span></Label>
              <Select value={ticketCategory} onValueChange={setTicketCategory}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="connection">Connection Issues</SelectItem>
                  <SelectItem value="billing">Billing & Payments</SelectItem>
                  <SelectItem value="account">Account Settings</SelectItem>
                  <SelectItem value="speed">Speed & Performance</SelectItem>
                  <SelectItem value="kyc">KYC Verification</SelectItem>
                  <SelectItem value="plan">Plan Changes</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description <span className="text-red-500">*</span></Label>
            <Textarea placeholder="Please describe your issue in detail..." value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} className="min-h-[100px] resize-none text-sm" />
          </div>
          <Button onClick={handleSubmitTicket} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs ripple">
            {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting...</> : <><Send className="h-3.5 w-3.5 mr-1.5" />Submit Ticket</>}
          </Button>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="rounded-lg border overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium pr-4">{faq.question}</span>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expandedFaq === idx ? 'rotate-90' : ''}`} />
              </button>
              {expandedFaq === idx && (
                <div className="px-3 pb-3 pt-0">
                  <Separator className="mb-2" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-slate-200/60 dark:border-slate-700/40 inset-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Contact className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Contact Us
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-xs text-muted-foreground">+1 (800) 123-4567</p>
                <p className="text-xs text-muted-foreground">Mon-Fri, 9AM-6PM</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-xs text-muted-foreground">support@isp-provider.com</p>
                <p className="text-xs text-muted-foreground">Response within 24 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Live Chat</p>
                <p className="text-xs text-muted-foreground">Available on website</p>
                <p className="text-xs text-muted-foreground">24/7 for urgent issues</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Office Address</p>
                <p className="text-xs text-muted-foreground">123 Network Blvd</p>
                <p className="text-xs text-muted-foreground">Tech City, TC 10001</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==========================================
// Main Selfcare Portal Component
// ==========================================

export function SelfcarePortal() {
  const [activeTab, setActiveTab] = useState<TabId>('register')

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-5">
      {/* Demo Notice */}
      <Card className="border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              This is a <strong>demo/simulated</strong> selfcare portal. All data shown is mock data for demonstration purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Banner */}
      <Card className="overflow-hidden border-emerald-200/40 dark:border-emerald-800/30">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Wifi className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{getGreeting()}!</h2>
              <p className="text-sm text-emerald-100">
                Welcome to your customer portal. Manage your account, services, billing, and more.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50">
        {TABS.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            className={`gap-1.5 text-xs rounded-lg transition-all flex-1 min-w-[120px] justify-center ${
              activeTab === tab.id
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'register' && <RegistrationTab />}
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'kyc' && <KycTab />}
        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'billing' && <BillingTab />}
        {activeTab === 'support' && <SupportTab />}
      </div>
    </div>
  )
}
