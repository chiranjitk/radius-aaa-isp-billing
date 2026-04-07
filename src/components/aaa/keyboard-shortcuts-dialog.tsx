'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Search } from 'lucide-react'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutItem {
  keys: string
  label: string
}

interface ShortcutSection {
  title: string
  shortcuts: ShortcutItem[]
}

const shortcutSections: ShortcutSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘K', label: 'Open Command Palette' },
      { keys: '⌘1', label: 'Go to Dashboard' },
      { keys: '⌘2', label: 'Go to RADIUS Users' },
      { keys: '⌘3', label: 'Go to NAS Devices' },
      { keys: '⌘4', label: 'Go to Billing Plans' },
      { keys: '⌘5', label: 'Go to Policy Engine' },
      { keys: '⌘6', label: 'Go to Active Sessions' },
      { keys: '⌘7', label: 'Go to Invoices & Payments' },
      { keys: '⌘8', label: 'Go to Reports & Analytics' },
      { keys: '⌘9', label: 'Go to RADIUS Dictionary' },
      { keys: '⌘0', label: 'Go to System Settings' },
      { keys: '⌘B', label: 'Toggle Sidebar' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: '⌘D', label: 'Toggle Dark Mode' },
      { keys: '⌘N', label: 'Add New User (Users view)' },
      { keys: '⌘S', label: 'Save (context-aware)' },
      { keys: '⌘E', label: 'Export Data (context-aware)' },
      { keys: '⌘R', label: 'Refresh Current View' },
      { keys: '⌘/', label: 'Focus Search' },
      { keys: 'Esc', label: 'Close Dialog / Clear Selection' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: '?', label: 'Show this help (via ⌘⇧/)' },
    ],
  },
]

function ShortcutRow({ keys, label }: ShortcutItem) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground truncate">{label}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        {keys.split(' ').map((key, i) => (
          <kbd
            key={`${key}-${i}`}
            className="inline-flex items-center justify-center min-w-[26px] h-6 rounded-md border border-border/60 bg-muted/60 px-2 font-mono text-[11px] font-medium text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Quick navigation and actions</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <DialogTitle className="text-lg font-semibold leading-none">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            Quick navigation and actions
          </DialogDescription>
        </div>

        <Separator />

        {/* Shortcuts list */}
        <div className="glass-card mx-4 my-3 rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-4">
          {shortcutSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div>
                {section.shortcuts.map((shortcut) => (
                  <ShortcutRow
                    key={shortcut.keys}
                    keys={shortcut.keys}
                    label={shortcut.label}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-t text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>
            Press{' '}
            <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 rounded border border-border/60 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-foreground shadow-[0_1px_1px_0_rgb(0_0_0/0.05)]">
              ⌘K
            </kbd>{' '}
            for full command search
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
