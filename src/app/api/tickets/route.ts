import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ==================== Seed Data ====================
const SEED_TICKETS = [
  {
    ticketNo: 'TKT-0001',
    subject: 'Cannot connect to WiFi hotspot at Branch A',
    description: 'User reports that all devices are unable to connect to the WiFi hotspot at Branch A location. The SSID is visible but authentication keeps failing with timeout errors. NAS device shows as online in the dashboard. Need investigation into RADIUS authentication flow for this specific NAS.',
    status: 'open',
    priority: 'high',
    category: 'network',
    username: 'jsmith',
    assignedTo: 'admin',
    hoursAgo: 2,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0002',
    subject: 'Incorrect invoice amount for premium plan',
    description: 'I was charged $89.99 instead of the $79.99 advertised price for the Premium Fiber plan. I signed up on March 1st and my first invoice shows the wrong amount. Please correct this billing discrepancy and issue a refund for the difference.',
    status: 'in_progress',
    priority: 'high',
    category: 'billing',
    username: 'mjohnson',
    assignedTo: 'billing-team',
    hoursAgo: 24,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0003',
    subject: 'Slow internet speed during peak hours',
    description: 'Internet speed drops significantly between 6 PM and 11 PM. Normal speed is 100 Mbps down but during peak hours it drops to 10-15 Mbps. This has been happening for the past two weeks. QoS policy may need adjustment for bandwidth management rules.',
    status: 'in_progress',
    priority: 'critical',
    category: 'technical',
    username: 'awilson',
    assignedTo: 'noc-team',
    hoursAgo: 48,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0004',
    subject: 'Request to upgrade from Basic to Premium plan',
    description: 'I would like to upgrade my current subscription from Basic (50 Mbps) to Premium (200 Mbps) plan. Please process the upgrade and let me know if there will be any prorated charges for the current billing cycle.',
    status: 'open',
    priority: 'low',
    category: 'billing',
    username: 'lbrown',
    assignedTo: null,
    hoursAgo: 6,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0005',
    subject: 'Account locked after multiple failed login attempts',
    description: 'My account was locked after I forgot my password and tried several times. I have since remembered it but cannot log in. Requesting an account unlock and possibly a password reset link to my registered email.',
    status: 'resolved',
    priority: 'medium',
    category: 'account',
    username: 'davisr',
    assignedTo: 'admin',
    hoursAgo: 72,
    resolvedHoursAgo: 68,
  },
  {
    ticketNo: 'TKT-0006',
    subject: 'PPPoE authentication failure on MikroTik router',
    description: 'PPPoE dialer on MikroTik CCR1036 keeps failing to authenticate. Error message in NAS log shows "Access-Reject" from RADIUS server. User credentials verified correct. Check RADIUS check attributes for this user - may need to verify the password hash format.',
    status: 'open',
    priority: 'critical',
    category: 'technical',
    username: 'tharris',
    assignedTo: 'admin',
    hoursAgo: 1,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0007',
    subject: 'Request for static IP address assignment',
    description: 'I need a static public IP address for my home office VPN setup. Currently on dynamic IP assignment. Please advise on the process and any additional charges for a static IP allocation from the IP pool.',
    status: 'open',
    priority: 'low',
    category: 'account',
    username: 'pgarcia',
    assignedTo: null,
    hoursAgo: 12,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0008',
    subject: 'Duplicate session detected on user account',
    description: 'RADIUS accounting shows two active sessions for user cmartinez from different NAS devices simultaneously. The Simultaneous-Use attribute is set to 1. Check if CoA (Change of Authorization) is properly configured on NAS devices to enforce session limits.',
    status: 'in_progress',
    priority: 'high',
    category: 'technical',
    username: 'cmartinez',
    assignedTo: 'noc-team',
    hoursAgo: 5,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0009',
    subject: 'Payment not reflected in account balance',
    description: 'Made a payment of $79.99 via bank transfer three days ago but the invoice still shows as pending. Transaction ID: TXN-20250315-001. Bank confirmed the transfer was successful. Please verify payment gateway integration.',
    status: 'open',
    priority: 'medium',
    category: 'billing',
    username: 'elee',
    assignedTo: 'billing-team',
    hoursAgo: 72,
    resolvedHoursAgo: null,
  },
  {
    ticketNo: 'TKT-0010',
    subject: 'Intermittent connection drops every 30 minutes',
    description: 'Experiencing connection drops approximately every 30 minutes. The session disconnects and automatically reconnects after 1-2 minutes. NAS logs show "Idle-Timeout" as the terminate cause but the user was actively using the connection. Session-Timeout attribute may need review.',
    status: 'resolved',
    priority: 'high',
    category: 'network',
    username: 'nguyen_t',
    assignedTo: 'noc-team',
    hoursAgo: 120,
    resolvedHoursAgo: 96,
  },
  {
    ticketNo: 'TKT-0011',
    subject: 'Request to add additional device MAC address',
    description: 'I want to register a new laptop to my account. My current MAC address filter only allows one device. Please add MAC address AA:BB:CC:DD:EE:FF to my allowed devices list in the RADIUS check attributes.',
    status: 'resolved',
    priority: 'low',
    category: 'account',
    username: 'rkumar',
    assignedTo: 'admin',
    hoursAgo: 168,
    resolvedHoursAgo: 144,
  },
  {
    ticketNo: 'TKT-0012',
    subject: 'NAS device unreachable - Site D router down',
    description: 'The Cisco ASR 1001-X at Site D is not responding to RADIUS authentication requests. Ping tests to the NAS IP are timing out. UPS battery backup reported low. This affects approximately 50 users at that location.',
    status: 'open',
    priority: 'critical',
    category: 'network',
    username: 'admin',
    assignedTo: 'noc-team',
    hoursAgo: 0.5,
    resolvedHoursAgo: null,
  },
]

async function seedIfEmpty() {
  const count = await db.ticket.count()
  if (count === 0) {
    const now = Date.now()
    for (const t of SEED_TICKETS) {
      await db.ticket.create({
        data: {
          ticketNo: t.ticketNo,
          subject: t.subject,
          description: t.description,
          status: t.status,
          priority: t.priority,
          category: t.category,
          username: t.username,
          assignedTo: t.assignedTo,
          createdAt: new Date(now - t.hoursAgo * 60 * 60 * 1000),
          updatedAt: new Date(now - t.hoursAgo * 60 * 60 * 1000),
          resolvedAt: t.resolvedHoursAgo
            ? new Date(now - t.resolvedHoursAgo * 60 * 60 * 1000)
            : null,
        },
      })
    }
  }
}

// ==================== GET ====================
export async function GET(request: NextRequest) {
  try {
    // Auto-seed if no tickets exist
    await seedIfEmpty()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const category = searchParams.get('category') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { ticketNo: { contains: search } },
        { subject: { contains: search } },
        { description: { contains: search } },
        { username: { contains: search } },
        { assignedTo: { contains: search } },
      ]
    }
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      where.status = status
    }
    if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
      where.priority = priority
    }
    if (category && ['billing', 'technical', 'account', 'network', 'general'].includes(category)) {
      where.category = category
    }

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.ticket.count({ where }),
    ])

    // Stats
    const [openCount, inProgressCount, resolvedCount, closedCount, criticalCount] = await Promise.all([
      db.ticket.count({ where: { status: 'open' } }),
      db.ticket.count({ where: { status: 'in_progress' } }),
      db.ticket.count({ where: { status: 'resolved' } }),
      db.ticket.count({ where: { status: 'closed' } }),
      db.ticket.count({ where: { priority: 'critical', status: { not: 'closed' } } }),
    ])

    return NextResponse.json({
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        openCount,
        inProgressCount,
        resolvedCount,
        closedCount,
        criticalCount,
        totalTickets: openCount + inProgressCount + resolvedCount + closedCount,
      },
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

// ==================== POST ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, description, priority, category, username, assignedTo } = body

    if (!subject || !description || !username) {
      return NextResponse.json(
        { error: 'Subject, description, and username are required' },
        { status: 400 }
      )
    }

    // Auto-generate ticket number
    const lastTicket = await db.ticket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketNo: true },
    })

    let nextNum = 1
    if (lastTicket?.ticketNo) {
      const match = lastTicket.ticketNo.match(/TKT-(\d+)/)
      if (match) nextNum = parseInt(match[1], 10) + 1
    }
    const ticketNo = `TKT-${String(nextNum).padStart(4, '0')}`

    const ticket = await db.ticket.create({
      data: {
        ticketNo,
        subject,
        description,
        status: 'open',
        priority: priority || 'medium',
        category: category || 'general',
        username,
        assignedTo: assignedTo || null,
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}

// ==================== PATCH ====================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, assignedTo, priority, subject, description, category } = body

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    const existing = await db.ticket.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (status) {
      data.status = status
      if ((status === 'resolved' || status === 'closed') && !existing.resolvedAt) {
        data.resolvedAt = new Date()
      }
      if (status === 'open' || status === 'in_progress') {
        data.resolvedAt = null
      }
    }
    if (assignedTo !== undefined) data.assignedTo = assignedTo
    if (priority) data.priority = priority
    if (subject) data.subject = subject
    if (description) data.description = description
    if (category) data.category = category

    const ticket = await db.ticket.update({
      where: { id },
      data,
    })

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
