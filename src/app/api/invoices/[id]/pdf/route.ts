import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices/[id]/pdf — Generate HTML invoice for print-to-PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            country: true,
            zipCode: true,
            company: true,
          },
        },
        plan: {
          select: {
            name: true,
            planType: true,
            billingCycle: true,
            price: true,
            currency: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const user = invoice.user
    const plan = invoice.plan
    const taxRate = invoice.amount > 0 ? ((invoice.tax / invoice.amount) * 100).toFixed(1) : '10.0'

    const statusColors: Record<string, string> = {
      paid: '#059669',
      pending: '#d97706',
      overdue: '#dc2626',
      cancelled: '#64748b',
      refunded: '#7c3aed',
    }

    const statusBgColors: Record<string, string> = {
      paid: '#d1fae5',
      pending: '#fef3c7',
      overdue: '#fee2e2',
      cancelled: '#f1f5f9',
      refunded: '#ede9fe',
    }

    const statusColor = statusColors[invoice.status] || '#64748b'
    const statusBg = statusBgColors[invoice.status] || '#f1f5f9'

    const fmtCurrency = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: plan?.currency || 'USD' }).format(n)

    const fmtDate = (d: Date) =>
      d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const userAddress = [
      user.address,
      user.city,
      user.state,
      user.zipCode,
      user.country,
    ]
      .filter(Boolean)
      .join(', ')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNo}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
      font-size: 14px;
    }

    @media print {
      body { font-size: 12px; }
      .no-print { display: none !important; }
      .invoice-container { box-shadow: none; border: none; }
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }

    /* Print button */
    .print-bar {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 40px;
      text-align: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .print-btn:hover {
      background: #1e293b;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #0f172a;
    }

    .company-info h1 {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .company-info .logo-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #059669, #0d9488);
      border-radius: 12px;
      margin-bottom: 12px;
      color: white;
      font-size: 20px;
      font-weight: 900;
    }

    .company-info p {
      color: #64748b;
      font-size: 13px;
      margin-top: 4px;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-title {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .invoice-meta .status-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
    }

    .invoice-meta .dates {
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
    }

    .invoice-meta .dates span {
      display: block;
    }

    .invoice-meta .dates strong {
      color: #334155;
    }

    /* Bill To */
    .bill-to-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
      gap: 40px;
    }

    .bill-to h3,
    .plan-info h3 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 12px;
    }

    .bill-to .name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .bill-to .username {
      font-size: 13px;
      color: #64748b;
    }

    .bill-to .detail {
      font-size: 13px;
      color: #475569;
      margin-top: 2px;
    }

    .plan-info .plan-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .plan-info .plan-detail {
      font-size: 13px;
      color: #475569;
      margin-top: 2px;
    }

    .plan-info .plan-tag {
      display: inline-block;
      margin-top: 8px;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f1f5f9;
      color: #475569;
      border: 1px dashed #cbd5e1;
    }

    /* Table */
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .invoice-table thead th {
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      text-align: left;
    }

    .invoice-table thead th:last-child,
    .invoice-table tbody td:last-child {
      text-align: right;
    }

    .invoice-table thead th:nth-child(3),
    .invoice-table tbody td:nth-child(3) {
      text-align: center;
    }

    .invoice-table tbody td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }

    .invoice-table tbody tr:last-child td {
      border-bottom: 2px solid #0f172a;
    }

    .invoice-table .description {
      font-weight: 600;
      color: #1e293b;
    }

    /* Total */
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .total-box {
      width: 280px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: #475569;
    }

    .total-row.final {
      border-top: 2px solid #0f172a;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }

    /* Footer */
    .footer {
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .footer .thank-you {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .footer .payment-info {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 16px;
    }

    .footer .generated {
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Print Button Bar -->
  <div class="print-bar no-print">
    <button class="print-btn" onclick="window.print()">
      &#9112; Print / Save as PDF
    </button>
  </div>

  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="logo-icon">FR</div>
        <h1>FreeRADIUS BSS</h1>
        <p>Network Access &amp; Billing Platform</p>
        <p>123 Network Avenue, Tech City, TC 10001</p>
        <p>billing@freeradius-bss.example</p>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">${invoice.invoiceNo}</div>
        <div class="status-badge" style="background: ${statusBg}; color: ${statusColor};">
          ${invoice.status.toUpperCase()}
        </div>
        <div class="dates">
          <span><strong>Date:</strong> ${fmtDate(new Date(invoice.createdAt))}</span>
          <span><strong>Due Date:</strong> ${fmtDate(new Date(invoice.dueDate))}</span>
          ${invoice.paidDate ? `<span><strong>Paid Date:</strong> ${fmtDate(new Date(invoice.paidDate))}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Bill To & Plan -->
    <div class="bill-to-section">
      <div class="bill-to">
        <h3>Bill To</h3>
        <div class="name">${user.fullName || user.username}</div>
        <div class="username">@${user.username}</div>
        ${user.email ? `<div class="detail">${user.email}</div>` : ''}
        ${user.phone ? `<div class="detail">${user.phone}</div>` : ''}
        ${userAddress ? `<div class="detail">${userAddress}</div>` : ''}
      </div>
      <div class="plan-info">
        <h3>Subscription Plan</h3>
        <div class="plan-name">${plan?.name || 'N/A'}</div>
        ${plan?.planType ? `<div class="plan-detail">Type: ${plan.planType}</div>` : ''}
        ${plan?.billingCycle ? `<div class="plan-tag">${plan.billingCycle} billing</div>` : ''}
      </div>
    </div>

    <!-- Invoice Table -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="description">${plan?.name || 'Service'} - ${plan?.billingCycle || 'monthly'} subscription</td>
          <td>1</td>
          <td>${fmtCurrency(invoice.amount)}</td>
          <td>${fmtCurrency(invoice.amount)}</td>
        </tr>
        <tr>
          <td class="description">Tax (${taxRate}%)</td>
          <td></td>
          <td></td>
          <td>${fmtCurrency(invoice.tax)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Total -->
    <div class="total-section">
      <div class="total-box">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${fmtCurrency(invoice.amount)}</span>
        </div>
        <div class="total-row">
          <span>Tax</span>
          <span>${fmtCurrency(invoice.tax)}</span>
        </div>
        <div class="total-row final">
          <span>Total</span>
          <span>${fmtCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">Thank you for your business!</div>
      <div class="payment-info">
        For payment inquiries, please contact billing@freeradius-bss.example
      </div>
      <div class="generated">
        Generated on ${generatedDate} &middot; FreeRADIUS BSS v2.3
      </div>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNo}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 })
  }
}
