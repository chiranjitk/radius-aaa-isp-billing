---
Task ID: 20
Agent: Main Orchestrator
Task: Role-Based Access Control + Activity Dashboard View

Work Log:
- Updated `src/lib/store.ts`:
  - Added `UserRole` type ('admin' | 'operator' | 'viewer')
  - Added `activeRole`, `setActiveRole`, `hasPermission` to AppState
  - Defined full permissions map for all 3 roles with per-module action lists
  - `setUser` now auto-updates `activeRole` when user logs in
  - `hasPermission` function checks role permissions for any module+action

- Enhanced `src/components/aaa/login-view.tsx`:
  - Added RadioGroup role selector below password field (after separator)
  - 3 roles: Administrator (Crown icon, emerald), Operator (Wrench icon, amber), Viewer (BookOpen icon, slate)
  - Each option shows icon + label + description with active highlight border
  - Default to "Administrator"
  - Demo Login button text updates to show selected role
  - handleDemoLogin passes selected role to setUser

- Updated `src/components/aaa/app-sidebar.tsx`:
  - Added `activity` nav item (ScrollText icon) in Overview group after Dashboard
  - Navigation items filtered by `hasPermission(id, 'view')`
  - Groups with no visible items are hidden entirely
  - Role badge added above collapse button showing ADMIN/OPERATOR/VIEWER with colored icons
  - `roleConfig` map defines badge styling per role (emerald/amber/slate)

- Created `src/components/aaa/activity-dashboard.tsx`:
  - 4 stat cards: Total Events (24h), Auth Success Rate, Active Alerts, API Requests
  - Stats fetched from enhanced `/api/audit-logs` endpoint
  - Activity Timeline: chronological list with user avatar, action badge (color-coded), module badge, details, relative time, IP, user agent
  - Filters: Module dropdown, Action dropdown, User search input, Clear button
  - Export: CSV/JSON dropdown using existing `export-utils.ts`
  - Auto-refresh: 15-second refetch interval with "Updating" badge indicator
  - Pagination with page numbers
  - Loading skeletons, empty state, error state with retry
  - Action colors: create=emerald, update=amber, delete=red, login=violet, export=teal

- Enhanced `/api/audit-logs` API route:
  - Added `username` query param with case-insensitive contains search
  - Added summary stats: totalEvents24h, authSuccessRate, activeAlerts, apiRequests
  - Stats computed from audit log counts (24h window)

- Updated `src/app/page.tsx`:
  - Added ActivityDashboard import
  - Added 'activity' to viewTitles
  - Added ScrollText icon import for description bar
  - Added rendering: `{activeView === 'activity' && <ActivityDashboard />}`

Stage Summary:
- ESLint passes with zero errors
- Dev server compiles cleanly (all routes 200 OK)
- Role-based access control fully functional with 3 roles
- Activity Dashboard with real-time monitoring, filtering, export
- All existing functionality preserved
