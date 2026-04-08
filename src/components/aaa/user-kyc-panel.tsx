'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Upload,
  CreditCard,
  MapPin,
  Camera,
  FileText,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Eye,
  Download,
  LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

// ==========================================
// Types
// ==========================================

interface UserDocument {
  id: string
  userId: string
  username: string
  docType: string
  docName: string
  fileName: string
  filePath: string
  fileSize?: number
  mimeType?: string
  status: string
  verifiedBy?: string
  verifiedAt?: string
  rejectReason?: string
  notes?: string
  createdAt: string
}

interface KycStatus {
  id: string
  username: string
  kycStatus: string
  kycVerifiedAt?: string
  kycVerifiedBy?: string
  kycNotes?: string
  idType?: string
  idNumber?: string
  documents: {
    total: number
    pending: number
    approved: number
    rejected: number
    types: Record<string, string>
  }
}

interface UserPhotoData {
  userId: string
  username: string
  profilePhoto?: string
}

// ==========================================
// Constants
// ==========================================

const DOC_TYPES: { value: string; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'id_proof', label: 'ID Proof', icon: CreditCard, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'address_proof', label: 'Address Proof', icon: MapPin, color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'photo', label: 'Photo', icon: Camera, color: 'text-sky-600 dark:text-sky-400' },
  { value: 'contract', label: 'Contract', icon: FileText, color: 'text-violet-600 dark:text-violet-400' },
  { value: 'other', label: 'Other', icon: FolderOpen, color: 'text-slate-600 dark:text-slate-400' },
]

const KYC_STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'verified', label: 'Verified' },
]

const KYC_STATUS_CONFIG: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800', icon: Upload },
  verified: { label: 'Verified', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: ShieldCheck },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800', icon: XCircle },
}

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getDocTypeIcon(docType: string): { icon: LucideIcon; color: string } {
  return DOC_TYPES.find((dt) => dt.value === docType) || DOC_TYPES[4]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ==========================================
// KYC Status Badge
// ==========================================

function KycStatusBadge({ status }: { status: string }) {
  const config = KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`gap-1.5 text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ==========================================
// KYC Progress Steps
// ==========================================

function KycProgressSteps({ currentStatus }: { currentStatus: string }) {
  const statusOrder = ['pending', 'submitted', 'verified']
  const currentIndex = statusOrder.indexOf(currentStatus)
  const isRejected = currentStatus === 'rejected'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {KYC_STEPS.map((step, idx) => {
          const isCompleted = !isRejected && idx <= currentIndex
          const isCurrent = !isRejected && idx === currentIndex

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
              {idx < KYC_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                  !isRejected && idx < currentIndex
                    ? 'bg-emerald-500'
                    : 'bg-border'
                }`} />
              )}
            </div>
          )
        })}
      </div>
      {isRejected && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 p-2.5 text-center">
          <p className="text-xs text-red-700 dark:text-red-400 flex items-center justify-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            KYC has been rejected. Please resubmit documents.
          </p>
        </div>
      )}
    </div>
  )
}

// ==========================================
// Document Upload Area
// ==========================================

function DocumentUploadArea({
  userId,
  queryKey,
}: {
  userId: string
  queryKey: string[]
}) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState('id_proof')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async ({ file, docTypeVal }: { file: File; docTypeVal: string }) => {
      const base64 = await fileToBase64(file)
      const res = await fetch(`/api/users/${userId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: docTypeVal,
          docName: file.name,
          fileName: file.name,
          filePath: base64,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to upload document')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      setIsUploading(false)
    },
  })

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    const file = files[0]
    uploadMutation.mutate({ file, docTypeVal: docType })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [docType, uploadMutation])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    await handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  return (
    <Card className="p-4 border-dashed">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>
                  {dt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground">Supports images, PDF, DOC files</p>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

// ==========================================
// Document Action Dialog
// ==========================================

function DocumentActionDialog({
  open,
  onOpenChange,
  action,
  document,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: 'approve' | 'reject'
  document: UserDocument | null
  onSuccess: () => void
}) {
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (!document) throw new Error('No document selected')
      const res = await fetch(`/api/users/${document.userId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'approve' ? 'approve_doc' : 'reject_doc',
          docId: document.id,
          notes,
        }),
      })
      if (!res.ok) throw new Error('Action failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success(`Document ${action}d successfully`)
      onSuccess()
      onOpenChange(false)
      setNotes('')
    },
    onError: () => {
      toast.error(`Failed to ${action} document`)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${action === 'reject' ? 'text-red-600' : 'text-emerald-600'}`}>
            {action === 'approve' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {action === 'approve' ? 'Approve Document' : 'Reject Document'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {action === 'approve'
              ? `Approve "${document?.docName || document?.fileName}"?`
              : `Reject "${document?.docName || document?.fileName}"? Please provide a reason.`}
          </p>
          <div className="space-y-2">
            <Label>{action === 'reject' ? 'Rejection Reason' : 'Notes (optional)'}</Label>
            <Textarea
              placeholder={action === 'reject' ? 'Enter reason for rejection...' : 'Optional notes...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant={action === 'reject' ? 'destructive' : 'default'}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (action === 'reject' && !notes.trim())}
          >
            {mutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// Main KYC Panel Component
// ==========================================

export function UserKycPanel({
  userId,
}: {
  userId: string
}) {
  const queryClient = useQueryClient()
  const queryKey = ['user-documents', userId]

  // Fetch KYC status
  const { data: kycData, isLoading: kycLoading } = useQuery<KycStatus>({
    queryKey: ['user-kyc', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/kyc`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!userId,
  })

  // Fetch documents
  const { data: docsData, isLoading: docsLoading } = useQuery<{ documents: UserDocument[] }>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/documents`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!userId,
  })

  // Fetch profile photo
  const { data: photoData } = useQuery<UserPhotoData>({
    queryKey: ['user-photo', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/photo`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!userId,
  })

  // Update KYC status mutation
  const updateKycMutation = useMutation({
    mutationFn: async ({ kycStatus, kycNotes }: { kycStatus: string; kycNotes?: string }) => {
      const res = await fetch(`/api/users/${userId}/kyc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kycStatus, kycVerifiedBy: 'admin', kycNotes }),
      })
      if (!res.ok) throw new Error('Failed to update KYC status')
      return res.json()
    },
    onSuccess: () => {
      toast.success('KYC status updated')
      queryClient.invalidateQueries({ queryKey: ['user-kyc', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] })
    },
    onError: () => {
      toast.error('Failed to update KYC status')
    },
  })

  // Upload photo mutation
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const handlePhotoUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setIsUploadingPhoto(true)
    try {
      const base64 = await fileToBase64(file)
      const res = await fetch(`/api/users/${userId}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhoto: base64 }),
      })
      if (!res.ok) throw new Error('Failed to upload photo')
      toast.success('Profile photo updated')
      queryClient.invalidateQueries({ queryKey: ['user-photo', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] })
    } catch {
      toast.error('Failed to upload profile photo')
    } finally {
      setIsUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }, [userId, queryClient])

  // Document action dialogs
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [actionDoc, setActionDoc] = useState<UserDocument | null>(null)

  const documents = docsData?.documents || []
  const isLoading = kycLoading || docsLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KYC Status Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            KYC Verification
          </h5>
          {kycData && <KycStatusBadge status={kycData.kycStatus} />}
        </div>

        <KycProgressSteps currentStatus={kycData?.kycStatus || 'pending'} />

        {/* KYC Actions */}
        {kycData && kycData.kycStatus !== 'verified' && (
          <div className="flex items-center gap-2">
            <Select
              value={kycData.kycStatus === 'rejected' ? 'submitted' : kycData.kycStatus === 'submitted' ? 'verified' : 'submitted'}
              onValueChange={(v) => updateKycMutation.mutate({ kycStatus: v })}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Mark Submitted</SelectItem>
                <SelectItem value="verified">Mark Verified</SelectItem>
                <SelectItem value="rejected">Mark Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => updateKycMutation.mutate({ kycStatus: 'verified' })}
              disabled={updateKycMutation.isPending}
            >
              {updateKycMutation.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Verify KYC
            </Button>
          </div>
        )}

        {/* KYC Info */}
        {kycData && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {kycData.idType && (
              <div>
                <span className="text-muted-foreground">ID Type: </span>
                <span className="font-medium">{kycData.idType}</span>
              </div>
            )}
            {kycData.idNumber && (
              <div>
                <span className="text-muted-foreground">ID Number: </span>
                <span className="font-medium">{kycData.idNumber}</span>
              </div>
            )}
            {kycData.kycVerifiedAt && (
              <div>
                <span className="text-muted-foreground">Verified: </span>
                <span className="font-medium">{format(new Date(kycData.kycVerifiedAt), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>
        )}

        {/* Document Progress */}
        {kycData && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Documents:</span>
            <Badge variant="outline" className="text-[10px]">
              {kycData.documents.total} total
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              {kycData.documents.approved} approved
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              {kycData.documents.pending} pending
            </Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* Profile Photo Section */}
      <div className="space-y-3">
        <h5 className="text-sm font-semibold flex items-center gap-1.5">
          <Camera className="h-4 w-4" />
          Profile Photo
        </h5>
        <div className="flex items-center gap-4">
          <div
            className="relative group cursor-pointer"
            onClick={() => photoInputRef.current?.click()}
          >
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              <AvatarImage src={photoData?.profilePhoto} alt="Profile" />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {kycData?.username?.substring(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploadingPhoto ? (
                <RefreshCw className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e.target.files)}
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Click avatar to upload photo</p>
            <p>Supports JPG, PNG, GIF</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Document Upload Section */}
      <div className="space-y-3">
        <h5 className="text-sm font-semibold flex items-center gap-1.5">
          <Upload className="h-4 w-4" />
          Upload Documents
        </h5>
        <DocumentUploadArea userId={userId} queryKey={queryKey} />
      </div>

      <Separator />

      {/* Documents Table */}
      <div className="space-y-3">
        <h5 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          Documents
          <span className="text-xs text-muted-foreground font-normal">({documents.length})</span>
        </h5>

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No documents uploaded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Size</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const { icon: DocIcon, color: docColor } = getDocTypeIcon(doc.docType)
                  const statusConf = DOC_STATUS_CONFIG[doc.status] || DOC_STATUS_CONFIG.pending

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <DocIcon className={`h-3.5 w-3.5 ${docColor}`} />
                          <span className="text-xs capitalize">{doc.docType.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[120px] truncate">{doc.docName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusConf.color}`}>
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                        {format(new Date(doc.createdAt), 'MMM dd')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {/* Preview (for images) */}
                          {doc.filePath?.startsWith('data:image') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                // Create preview in a new window
                                const w = window.open('', '_blank')
                                if (w) {
                                  w.document.write(`<html><head><title>${doc.docName}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111;}</style></head><body><img src="${doc.filePath}" style="max-width:90%;max-height:90vh;" /></body></html>`)
                                }
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          {doc.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                onClick={() => {
                                  setActionType('approve')
                                  setActionDoc(doc)
                                  setActionDialogOpen(true)
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setActionType('reject')
                                  setActionDoc(doc)
                                  setActionDialogOpen(true)
                                }}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Document Action Dialog */}
      <DocumentActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        action={actionType}
        document={actionDoc}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey })
        }}
      />
    </div>
  )
}
