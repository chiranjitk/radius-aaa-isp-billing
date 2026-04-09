'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  Users,
  Server,
  CreditCard,
  Shield,
  Activity,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  Moon,
  Database,
  Search,
  Globe,
  UserPlus,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { create } from 'zustand'

// Standalone store for command palette open state so any component can trigger it
const useCommandPaletteStore = create<{ isOpen: boolean; open: () => void; close: () => void; toggle: () => void }>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))

export { useCommandPaletteStore }

interface CommandItem {
  id: string
  label: string
  category: 'Navigation' | 'Actions' | 'Users'
  icon: LucideIcon
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const { theme, setTheme } = useTheme()
  const { isOpen, open, close, toggle } = useCommandPaletteStore()

  // User lookup state
  const [userQuery, setUserQuery] = useState<string | null>(null)
  const [userResults, setUserResults] = useState<Array<{ id: string; username: string; fullName: string | null }>>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        category: 'Navigation',
        icon: LayoutDashboard,
        action: () => setActiveView('dashboard'),
      },
      {
        id: 'nav-users',
        label: 'Go to RADIUS Users',
        category: 'Navigation',
        icon: Users,
        action: () => setActiveView('users'),
      },
      {
        id: 'nav-nas',
        label: 'Go to NAS Devices',
        category: 'Navigation',
        icon: Server,
        action: () => setActiveView('nas'),
      },
      {
        id: 'nav-plans',
        label: 'Go to Billing Plans',
        category: 'Navigation',
        icon: CreditCard,
        action: () => setActiveView('plans'),
      },
      {
        id: 'nav-policies',
        label: 'Go to Policy Engine',
        category: 'Navigation',
        icon: Shield,
        action: () => setActiveView('policies'),
      },
      {
        id: 'nav-sessions',
        label: 'Go to Active Sessions',
        category: 'Navigation',
        icon: Activity,
        action: () => setActiveView('sessions'),
      },
      {
        id: 'nav-billing',
        label: 'Go to Invoices',
        category: 'Navigation',
        icon: FileText,
        action: () => setActiveView('billing'),
      },
      {
        id: 'nav-reports',
        label: 'Go to Reports',
        category: 'Navigation',
        icon: BarChart3,
        action: () => setActiveView('reports'),
      },
      {
        id: 'nav-dictionary',
        label: 'Go to RADIUS Dictionary',
        category: 'Navigation',
        icon: BookOpen,
        action: () => setActiveView('dictionary'),
      },
      {
        id: 'nav-ip-pools',
        label: 'Go to IP Pool Management',
        category: 'Navigation',
        icon: Globe,
        action: () => setActiveView('ip-pools'),
      },
      {
        id: 'nav-settings',
        label: 'Go to System Settings',
        category: 'Navigation',
        icon: Settings,
        action: () => setActiveView('settings'),
      },
      {
        id: 'nav-registrations',
        label: 'Go to Registrations',
        category: 'Navigation',
        icon: UserPlus,
        action: () => setActiveView('registrations'),
      },
      {
        id: 'nav-selfcare',
        label: 'Go to Selfcare Portal',
        category: 'Navigation',
        icon: UserCog,
        action: () => setActiveView('selfcare'),
      },
      {
        id: 'action-dark-mode',
        label: 'Toggle Dark Mode',
        category: 'Actions',
        icon: Moon,
        shortcut: '',
        action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'action-seed',
        label: 'Seed Demo Data',
        category: 'Actions',
        icon: Database,
        shortcut: '',
        action: async () => {
          try {
            toast.loading('Seeding demo data...', { id: 'seed' })
            const res = await fetch('/api/seed', { method: 'POST' })
            if (!res.ok) throw new Error('Failed to seed data')
            toast.success('Demo data seeded successfully!', { id: 'seed' })
          } catch {
            toast.error('Failed to seed demo data', { id: 'seed' })
          }
        },
      },
    ],
    [setActiveView, setTheme, theme]
  )

  // User lookup effect — search users API with debounce
  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setUserQuery(null)
      setUserResults([])
      if (userSearchTimerRef.current) clearTimeout(userSearchTimerRef.current)
      return
    }

    // Don't trigger user search for very short queries or command-like queries
    const looksLikeUserSearch = search.length >= 2 && !search.startsWith('Go to') && !search.startsWith('Toggle') && !search.startsWith('Seed')

    if (!looksLikeUserSearch) {
      setUserQuery(null)
      setUserResults([])
      return
    }

    setUserSearchLoading(true)
    setUserQuery(search)

    if (userSearchTimerRef.current) clearTimeout(userSearchTimerRef.current)
    userSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(search)}&limit=5`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setUserResults((data.users || []).map((u: { id: string; username: string; fullName: string | null }) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
        })))
      } catch {
        setUserResults([])
      } finally {
        setUserSearchLoading(false)
      }
    }, 250)

    return () => {
      if (userSearchTimerRef.current) clearTimeout(userSearchTimerRef.current)
    }
  }, [search])

  // Build user command items from results
  const userCommands: CommandItem[] = useMemo(() => {
    if (!userQuery || userResults.length === 0) return []
    return userResults.map((u) => ({
      id: `user-${u.id}`,
      label: `${u.fullName ? `${u.fullName} ` : ''}(${u.username})`,
      category: 'Users' as const,
      icon: Users,
      action: () => {
        // Navigate to users view with the search pre-filled
        setActiveView('users')
      },
    }))
  }, [userResults, userQuery, setActiveView])

  // Combine all items
  const allItems = useMemo(() => {
    if (userCommands.length > 0) {
      return [...userCommands, ...commands]
    }
    return commands
  }, [userCommands, commands])

  const filtered = useMemo(() => {
    if (!search.trim()) return commands
    const q = search.toLowerCase()
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q))
  }, [commands, search])

  // Group filtered commands by category
  const grouped = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = []
    let currentCategory = ''

    if (userCommands.length > 0 && userQuery) {
      // Show user results first
      if (userCommands.length > 0) {
        groups.push({ category: 'Users', items: userCommands })
      }
    }

    for (const cmd of filtered) {
      if (cmd.category !== currentCategory) {
        groups.push({ category: cmd.category, items: [cmd] })
        currentCategory = cmd.category
      } else {
        groups[groups.length - 1].items.push(cmd)
      }
    }
    return groups
  }, [filtered, userCommands, userQuery])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setActiveIndex(0)
      setUserQuery(null)
      setUserResults([])
      setUserSearchLoading(false)
      // Auto-focus input after dialog animation
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Global keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  // Arrow key navigation + Enter to select within dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % allItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + allItems.length) % allItems.length)
      } else if (e.key === 'Enter' && allItems[activeIndex]) {
        e.preventDefault()
        const cmd = allItems[activeIndex]
        cmd.action()
        close()
      }
    },
    [allItems, activeIndex, close]
  )

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  const executeCommand = (cmd: CommandItem) => {
    cmd.action()
    close()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) close() }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search and navigate the application</DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands or users... ⌘K"
            className="flex-1 h-12 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {userSearchLoading && (
            <span className="text-[10px] text-muted-foreground animate-pulse">...</span>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {group.category}
                </div>
                {group.items.map((cmd) => {
                  const flatIndex = allItems.indexOf(cmd)
                  const Icon = cmd.icon
                  const isActive = flatIndex === activeIndex

                  return (
                    <button
                      key={cmd.id}
                      data-active={isActive}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer text-left ${
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-accent/50'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t px-3 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd>
            Close
          </span>
          <span className="ml-auto hidden sm:flex items-center gap-1 opacity-60">
            Type a name to search users
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
