import { NextResponse } from 'next/server'
import { readNotifications } from '@/lib/notification-store'

interface Notification {
  id: string
  type: 'auth' | 'session' | 'nas' | 'billing' | 'system'
  title: string
  description: string
  time: string
  severity: 'info' | 'success' | 'warning' | 'error'
  read: boolean
}

function generateNotifications(): Notification[] {
  return [
    {
      id: 'notif-1',
      type: 'auth',
      title: 'Authentication failure: admin@corp',
      description:
        'Multiple failed login attempts detected from IP 203.0.113.45 (5 attempts in 2 minutes)',
      time: '1m ago',
      severity: 'error',
      read: readNotifications.has('notif-1'),
    },
    {
      id: 'notif-2',
      type: 'auth',
      title: 'User emily.watson authenticated successfully',
      description: 'Login via MS-CHAPv2 from NAS DC1-CORE-01 (192.168.1.10)',
      time: '3m ago',
      severity: 'success',
      read: readNotifications.has('notif-2'),
    },
    {
      id: 'notif-3',
      type: 'session',
      title: 'Session started: john.smith',
      description: 'Connected to NAS BRANCH-02, session ID ac1204f8-3b2a-4c1d',
      time: '5m ago',
      severity: 'info',
      read: readNotifications.has('notif-3'),
    },
    {
      id: 'notif-4',
      type: 'session',
      title: 'Session stopped: sarah.chen',
      description: 'Normal disconnect after 4h 32m, 2.4 GB transferred',
      time: '8m ago',
      severity: 'info',
      read: readNotifications.has('notif-4'),
    },
    {
      id: 'notif-5',
      type: 'nas',
      title: 'NAS BRANCH-03 status changed to DOWN',
      description:
        'Device at 10.0.3.1 is unreachable — last contact 15 minutes ago',
      time: '15m ago',
      severity: 'error',
      read: readNotifications.has('notif-5'),
    },
    {
      id: 'notif-6',
      type: 'nas',
      title: 'NAS DC1-CORE-01 recovered',
      description: 'Device is now reachable and accepting RADIUS requests',
      time: '25m ago',
      severity: 'success',
      read: readNotifications.has('notif-6'),
    },
    {
      id: 'notif-7',
      type: 'billing',
      title: 'Invoice INV-2024-0042 created for mike.jones',
      description: 'Monthly subscription: Premium Plan — $89.99 due April 1, 2024',
      time: '42m ago',
      severity: 'info',
      read: readNotifications.has('notif-7'),
    },
    {
      id: 'notif-8',
      type: 'billing',
      title: 'Payment received: $49.99 from lisa.park',
      description: 'Credit card payment applied to invoice INV-2024-0038',
      time: '1h ago',
      severity: 'success',
      read: readNotifications.has('notif-8'),
    },
    {
      id: 'notif-9',
      type: 'system',
      title: 'System backup completed successfully',
      description:
        'Full database backup completed in 12.3s (snapshot: 20240315_030000)',
      time: '2h ago',
      severity: 'success',
      read: readNotifications.has('notif-9'),
    },
    {
      id: 'notif-10',
      type: 'system',
      title: 'RADIUS configuration updated',
      description: 'Client secret rotated for NAS DC1-CORE-01 by admin',
      time: '3h ago',
      severity: 'warning',
      read: readNotifications.has('notif-10'),
    },
  ]
}

// GET /api/notifications
export async function GET() {
  const notifications = generateNotifications()
  return NextResponse.json(notifications)
}
