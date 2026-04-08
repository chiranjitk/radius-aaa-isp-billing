# Task ID: 16 — Audit Log Export, System Health API, Dashboard Enhancements

## Work Summary

### 1. `/api/audit-logs` API Endpoint (GET)
- Created `src/app/api/audit-logs/route.ts`
- Query params: `page`, `limit` (default 50), `action`, `module`, `startDate`, `endDate`
- Returns: `{ logs: AuditLog[], total: number, page: number, limit: number }`
- Supports filtering by action and module
- Supports date range filtering (endDate clamped to 23:59:59)
- Uses Prisma `db.auditLog.findMany` with proper where clause building

### 2. Audit Log Export in Settings View
- Added `DropdownMenu` with "Export CSV" and "Export JSON" options next to existing audit log filter controls
- Import additions: `Download`, `FileSpreadsheet`, `FileJson` from lucide-react; `DropdownMenu` components; `exportToCSV`, `exportToJSON`, `ExportOptions` from export-utils
- Export columns: Timestamp, Username, Action, Module, Details, IP Address
- Timestamps formatted as readable `toLocaleString()` dates
- Success toast shown on export via `sonner`
- Button disabled when loading or no audit logs

### 3. `/api/system-health` API Endpoint (GET)
- Created `src/app/api/system-health/route.ts`
- Returns simulated but realistic system health data:
  - CPU: usage, cores (8), temperature (dynamic based on load)
  - Memory: total (16 GB), used, usage percentage
  - Disk: total (500 GB), used, usage percentage
  - Network: 3 interfaces (eth0, eth1, lo) with RX/TX totals
  - Uptime: accumulating counter
  - RADIUS: status, total auth/acct counts (incrementing), avg response time
  - Services: 6 services (FreeRADIUS x2, SQLite, Web Server, Cron, Firewall)
- Values have small random variance per request for realistic feel
- Base values persist across requests via module-level variables

### 4. System Health Panel on Dashboard
- Added `SystemHealthPanel` component in `dashboard-view.tsx`
- Placed below the existing System Health Bar
- Collapsible card with chevron toggle (`ChevronRight` rotates 90° when expanded)
- Uses `inset-card` and `hover-lift` CSS classes
- Fetches from `/api/system-health` with `useQuery`, refreshes every 5 seconds
- Contains:
  - CPU/Memory/Disk usage bars using `.data-bar` / `.data-bar-fill` CSS classes
  - Color-coded percentage labels (green/amber/red based on thresholds)
  - Temperature display for CPU
  - Used/total display for memory and disk
  - 4 stat cards: Uptime, RADIUS Status (with StatusDot), Auth Requests, Avg Response Time
  - Network interfaces table (name, status, RX, TX)
  - Services list with status dots, uptime, and port numbers
- Skeleton loading state while data loads
- "Healthy" badge with animated pulse dot

### Files Modified
- `src/app/api/audit-logs/route.ts` (new)
- `src/app/api/system-health/route.ts` (new)
- `src/components/aaa/settings-view.tsx` (export dropdown added)
- `src/components/aaa/dashboard-view.tsx` (SystemHealthPanel component added)

### Verification
- ESLint: zero errors
- Dev server: compiling successfully, no compilation errors in logs
- All existing functionality preserved
