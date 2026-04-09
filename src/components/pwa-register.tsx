'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | null = null

    const registerSw = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'activated' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker activated - dispatch custom event
              window.dispatchEvent(
                new CustomEvent('sw-update-available', {
                  detail: { registration },
                })
              )
            }
          })
        })

        // Check for updates periodically (every 30 minutes)
        const intervalMs = 30 * 60 * 1000
        const checkInterval = setInterval(() => {
          registration?.update().catch(() => {})
        }, intervalMs)

        return () => clearInterval(checkInterval)
      } catch (error) {
        console.warn('PWA: Service worker registration failed:', error)
      }
    }

    // Register after the page has fully loaded
    if (document.readyState === 'complete') {
      registerSw()
    } else {
      window.addEventListener('load', registerSw)
      return () => window.removeEventListener('load', registerSw)
    }

    // Cleanup
    return () => {}
  }, [])

  return null
}
