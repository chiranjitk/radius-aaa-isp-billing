'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, X, RefreshCw, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Read sessionStorage outside of React to avoid lint issues
function getInitialDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('pwa-prompt-dismissed') === 'true'
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  // Initialize from sessionStorage synchronously
  const [dismissed] = useState(getInitialDismissed)

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show the install banner after a short delay
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => clearTimeout(timer)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Listen for service worker update events
  useEffect(() => {
    const handler = () => {
      setUpdateAvailable(true)
      setShowPrompt(true)
    }

    window.addEventListener('sw-update-available', handler)

    return () => window.removeEventListener('sw-update-available', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }

    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }
    setUpdateAvailable(false)
    setShowPrompt(false)
    window.location.reload()
  }, [])

  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
    sessionStorage.setItem('pwa-prompt-dismissed', 'true')
  }, [])

  // Don't render if hidden or dismissed (unless update available)
  if (!showPrompt) return null
  if (dismissed && !updateAvailable) return null
  if (!deferredPrompt && !updateAvailable) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg shadow-xl shadow-black/10 p-4 sm:p-5">
          {/* Update Available Banner */}
          {updateAvailable ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50">
                <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Update Available</p>
                <p className="text-xs text-muted-foreground">
                  A new version of the app is ready.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleUpdate}
                className="shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Update
              </Button>
            </div>
          ) : (
            /* Install Prompt Banner */
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Install App</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add RADIUS AAA to your home screen for quick access and
                  offline support.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Install
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleDismiss}
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
