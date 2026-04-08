# Task 4-users — RADIUS Users Management Module

## Summary
Created 3 production-ready files for the RADIUS Users management module of a FreeRADIUS AAA/BSS system.

## Files Created

### 1. `/home/z/my-project/src/app/api/users/route.ts`
- **GET /api/users**: Lists users with search (username/name/email), status filter, group filter, and pagination (page, limit default 20). Returns `{ users, total, page, totalPages }` with included groups, attribute counts, and session counts.
- **POST /api/users**: Creates a new RADIUS user. Accepts `{ username, password, fullName, email, phone, company, address, authType, simultaneous, status, groupIds }`. Creates a RadCheck with "Cleartext-Password" attribute, validates uniqueness, and optionally maps groups. Returns 201 with created user.

### 2. `/home/z/my-project/src/app/api/users/[id]/route.ts`
- **GET /api/users/[id]**: Fetches single user with full details including groups, check/reply attributes, recent sessions (last 20), subscriptions with plans, and counts.
- **PUT /api/users/[id]**: Updates user fields, handles username changes with cascade reference updates, password changes update RadCheck, supports full replacement of check/reply attributes and group assignments.
- **DELETE /api/users/[id]**: Deletes user and all related data (RadAcct, RadPostAuth, RadCheck, RadReply, RadUserGroup) with proper ordering for FK constraints.

### 3. `/home/z/my-project/src/components/aaa/users-view.tsx`
Full CRUD client component featuring:
- **Header**: Title "RADIUS Users" with subtitle and "Add User" button
- **Filter Bar**: Search input with debounce, Status dropdown, Group dropdown, Refresh button
- **Data Table**: Responsive table with columns (Username with avatar+counts, Full Name, Email, Groups badges, Status badge, Auth Type, Simultaneous, Actions dropdown)
- **Actions**: View Details (Sheet), Edit (Dialog), Enable/Disable toggle, Delete (AlertDialog confirmation)
- **Pagination**: Smart page number display with prev/next
- **Add/Edit Dialog**: Full form with basic info (username, password, name, email, phone, company, address), RADIUS settings (auth type, simultaneous, status), group assignment multi-select, dynamic check attributes section, dynamic reply attributes section
- **Details Sheet**: Right-side Sheet with 4 tabs (Overview, Attributes, Sessions, Billing) showing all user information
- **Loading/Error/Empty states**: Skeleton loaders, error with retry, empty state with call-to-action
- Uses TanStack React Query (useQuery/useMutation), Sonner toasts, shadcn/ui components (Dialog, Sheet, Table, AlertDialog, Select, Badge, Tabs, DropdownMenu, etc.)

## Lint Status
All 3 new files pass ESLint with zero errors. Pre-existing errors in other files (plans-view.tsx syntax, missing settings-view) are unrelated.

## Notes
- Groups are loaded from `/api/groups` (assumed to exist from another task)
- All API routes use `import { db } from '@/lib/db'` as specified
- No indigo/blue colors used; status badges use emerald/red/amber color scheme
- Responsive design with mobile-first approach
