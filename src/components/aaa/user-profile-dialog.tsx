'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  LogIn,
  Settings,
  UserPlus,
  FileText,
  LogOut,
  Shield,
  Server,
  Download,
  KeyRound,
  Copy,
  RefreshCw,
  ExternalLink,
  Clock,
  Mail,
  ShieldCheck,
  Activity,
  Lock,
} from 'lucide-react'

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Activity items data
const activityItems = [
  { icon: LogIn, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400', title: 'Logged in from 192.168.1.100', time: '2 min ago', description: 'Successful authentication via admin panel' },
  { icon: Settings, color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/50 dark:text-violet-400', title: 'Modified RADIUS settings', time: '15 min ago', description: 'Updated authentication timeout to 30s' },
  { icon: UserPlus, color: 'text-sky-600 bg-sky-100 dark:bg-sky-950/50 dark:text-sky-400', title: 'Created user mark.wilson', time: '1h ago', description: 'New user added to group "enterprise-users"' },
  { icon: FileText, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400', title: 'Generated invoice #INV-0150', time: '2h ago', description: 'Monthly billing for enterprise plan' },
  { icon: LogOut, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400', title: 'Disconnected session user@wan', time: '3h ago', description: 'Session terminated due to idle timeout' },
  { icon: Shield, color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/50 dark:text-violet-400', title: 'Updated policy Rate-Limit', time: '5h ago', description: 'Modified bandwidth limit to 100Mbps downstream' },
  { icon: Server, color: 'text-sky-600 bg-sky-100 dark:bg-sky-950/50 dark:text-sky-400', title: 'Added NAS device BR-Router-02', time: '6h ago', description: 'New NAS registered with shared secret' },
  { icon: Download, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400', title: 'Exported users to CSV', time: '1d ago', description: 'Bulk export of 342 user records' },
]

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const startRef = useRef<number | null>(null)
  const [sessionSeconds, setSessionSeconds] = useState(0)

  // Live session counter
  useEffect(() => {
    if (!open) return
    startRef.current = Date.now()
    const interval = setInterval(() => {
      if (startRef.current !== null) {
        setSessionSeconds(Math.floor((Date.now() - startRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        {/* Header with avatar and info */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xl font-bold">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Admin</h2>
                <Badge variant="outline" className="gap-1.5 text-[10px] font-medium px-2 h-5 rounded-full border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 status-pulse" />
                  Online
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">System Administrator</p>
            </div>
          </div>

          <Separator className="mt-4" />

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="w-full h-9">
              <TabsTrigger value="overview" className="flex-1 text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 text-xs">
                Activity
              </TabsTrigger>
              <TabsTrigger value="security" className="flex-1 text-xs">
                Security
              </TabsTrigger>
            </TabsList>

            {/* ===== Overview Tab ===== */}
            <TabsContent value="overview" className="mt-3 space-y-3">
              {/* Email */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Email</p>
                  <p className="text-sm font-medium mt-1 truncate">admin@radius.local</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Role</p>
                  <p className="text-sm font-medium mt-1">Super Administrator</p>
                </div>
              </div>

              {/* Last Login */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Last Login</p>
                  <p className="text-sm font-medium mt-1">Just now</p>
                </div>
              </div>

              {/* Session Duration (live counter) */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Session Duration</p>
                  <p className="text-sm font-mono font-medium mt-1 tabular-nums">
                    {formatDuration(sessionSeconds)}
                  </p>
                </div>
              </div>

              {/* API Requests Today */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">API Requests Today</p>
                  <p className="text-sm font-medium mt-1 tabular-nums">1,247</p>
                </div>
              </div>

              {/* Two-Factor Auth */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Two-Factor Auth</p>
                  <div className="mt-1">
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 border-0 text-[11px] font-medium px-2 h-5">
                      Enabled
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== Activity Tab ===== */}
            <TabsContent value="activity" className="mt-3">
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {activityItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="group flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50 cursor-default"
                    title={item.description}
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 ${item.color}`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ===== Security Tab ===== */}
            <TabsContent value="security" className="mt-3 space-y-3">
              {/* Password */}
              <Card className="card-hover shadow-none border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Password</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          ••••••••••
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* API Key */}
              <Card className="card-hover shadow-none border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">API Key</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          sk-••••••••••••••••••3f7a
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5 gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card className="card-hover shadow-none border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Sessions</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          2 active sessions
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2.5 gap-1 text-primary hover:text-primary">
                      View All
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Trusted IPs */}
              <Card className="card-hover shadow-none border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Trusted IPs</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        192.168.1.0/24, 10.0.0.0/8
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <Separator />
        <DialogFooter className="px-6 py-3 gap-2 sm:gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Sign Out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>

        {/* Hidden accessible description for screen readers */}
        <DialogDescription className="sr-only">
          Manage your profile settings, view activity, and configure security options.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
