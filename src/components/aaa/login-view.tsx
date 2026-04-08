'use client'

import { useState, useCallback, type FormEvent } from 'react'
import { useTheme } from 'next-themes'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Radio,
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Monitor,
} from 'lucide-react'
import { toast } from 'sonner'

export function LoginView() {
  const { theme, setTheme } = useTheme()
  const { setAuthenticated, setUser, setActiveView } = useAppStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault()
      setError('')

      if (!username.trim() || !password.trim()) {
        setError('Please enter both username and password.')
        return
      }

      setLoading(true)

      // Simulated authentication delay
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // Accept any non-empty credentials
      if (username.trim() && password.trim()) {
        setAuthenticated(true)
        setUser({ username: username.trim(), role: 'admin' })
        setActiveView('dashboard')
        toast.success(`Welcome back, ${username.trim()}!`, {
          description: 'Successfully authenticated.',
        })
      } else {
        setError('Invalid credentials. Please try again.')
      }

      setLoading(false)
    },
    [username, password, setAuthenticated, setUser, setActiveView]
  )

  const handleDemoLogin = useCallback(() => {
    setUsername('admin')
    setPassword('admin')
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && username.trim() && password.trim()) {
        handleLogin()
      }
    },
    [handleLogin, username, password]
  )

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* Background decorations */}
      <div className="dot-pattern absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.05]" />
      {/* Decorative blob */}
      <div className="blob absolute -bottom-40 -left-40 h-[500px] w-[500px] bg-primary/[0.06] blur-3xl pointer-events-none" />
      <div className="blob absolute -top-40 -right-40 h-[400px] w-[400px] bg-primary/[0.04] blur-3xl pointer-events-none" style={{ animationDelay: '-4s' }} />
      {/* Grid pattern overlay on one side */}
      <div className="absolute inset-y-0 left-0 w-1/3 grid-pattern opacity-30 pointer-events-none" />

      {/* Floating accent circles */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/[0.03] blur-3xl" />

      {/* Login Card */}
      <Card className="glass-card gradient-border card-shine relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <CardHeader className="space-y-4 pb-2 pt-8 px-8">
          {/* Logo + Branding */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25">
              <Radio className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-bold tracking-tight shimmer-text">
                FreeRADIUS
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                AAA/BSS Management Platform
              </p>
            </div>
          </div>

          {/* System Status Badge */}
          <div className="flex items-center justify-center">
            <Badge
              variant="outline"
              className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="status-pulse pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              All Systems Operational
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-2 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Secure Connection Badge */}
            <div className="flex items-center justify-center mb-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 text-[10px] font-normal px-2.5 py-0.5 rounded-full border-border/60 bg-muted/30 text-muted-foreground"
              >
                <Shield className="h-3 w-3 text-emerald-500" />
                Secure Connection
              </Badge>
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (error) setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  className="h-11 pl-10 pr-4"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  className="h-11 pl-10 pr-10"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive animate-fade-in-up">
                <Shield className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading}
              />
              <Label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Remember me
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold cursor-pointer btn-glow ripple"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Demo Login */}
          <div className="mt-4">
            <Separator className="mb-4" />
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 text-sm font-medium cursor-pointer hover-lift ripple"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              <Monitor className="h-4 w-4 mr-2 text-muted-foreground" />
              Demo Login (admin / admin)
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-3 pb-8 pt-2 px-8">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer h-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Monitor className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Monitor className="h-3.5 w-3.5 mr-1.5" />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>

          {/* Copyright */}
          <p className="text-[11px] text-muted-foreground/60 text-center">
            © 2025 FreeRADIUS BSS. All rights reserved.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
