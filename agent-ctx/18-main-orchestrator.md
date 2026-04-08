---
Task ID: 18
Agent: Main Orchestrator
Task: Invoice PDF Generation + Automated Billing Cycle API

Work Log:
- Read worklog.md and assessed full project status (v2.3, AAA/RADIUS BSS)
- Read existing billing-view.tsx (1110 lines), billing API routes, Prisma schema
- Created `/api/invoices/[id]/pdf/route.ts` (GET endpoint):
  - Fetches invoice with user details (fullName, email, phone, address, city, state, country, zipCode) and plan (name, planType, billingCycle, price, currency)
  - Generates a well-formatted HTML invoice with print-optimized CSS
  - Includes: company header (FreeRADIUS BSS with FR logo icon, address), invoice title with status badge, date/due date/paid date, Bill To section, Plan details with billing cycle tag, itemized table (subscription + tax), total section, footer with thank-you message and payment info
  - Has a "Print / Save as PDF" button at the top (hidden during print via @media print)
  - Uses proper A4 page sizing, responsive layout, professional typography
  - Returns Content-Type: text/html with Content-Disposition: inline
- Created `/api/billing/auto-generate/route.ts` (POST endpoint):
  - Accepts optional planId and cycle filter parameters
  - Finds all active subscriptions with autoRenew=true and nextBilling <= now + 7 days
  - For each qualifying subscription, creates an Invoice with sequential invoiceNo (INV-00001 format)
  - Calculates tax at 10%, sets dueDate = now + 30 days, status = pending
  - Updates subscription nextBilling based on plan billingCycle (daily/weekly/monthly/yearly)
  - Creates AuditLog entries for each invoice and a summary entry
  - Returns { success, generated, details: [{ planName, invoiceNo, amount }] }
- Updated `billing-view.tsx` with:
  - Added Printer and Loader2 icon imports
  - Added `generateDialogOpen` and `generating` state variables
  - Added `handleAutoGenerate()` function that calls POST /api/billing/auto-generate and shows success toast
  - Added `handleDownloadPdf()` function that opens /api/invoices/[id]/pdf in new browser tab
  - Added "Generate Invoices" button (FileText icon, outline variant) in action bar before Create Invoice
  - Added confirmation AlertDialog for auto-generate with loading state (Loader2 spinner)
  - Changed "Download PDF" dropdown action from mock toast to actual `handleDownloadPdf(inv.id)` call
  - Added "Print" button (Printer icon) in Invoice Detail Sheet header
  - Updated status badge colors: cancelled changed from gray to slate, refunded changed from teal to violet
- ESLint passes clean with zero errors
- Dev server compiles successfully with no errors

Stage Summary:
- 2 new API endpoints created: invoice PDF generation and auto-generate billing
- Billing view enhanced with 3 new features: auto-generate invoices, real PDF download, print button
- Status badge colors updated per spec (cancelled=slate, refunded=violet)
- All existing functionality preserved, no breaking changes
