# Task 12 - Bulk Operations (Batch User Actions & Batch Session Disconnect)

## Agent: Main Orchestrator

## Work Log

### Analysis
- Reviewed worklog.md to understand project context (v2.3, AAA/RADIUS BSS system)
- Found existing `/api/users/bulk` endpoint already handling enable/disable/delete
- Found users-view.tsx already had: row selection checkboxes, select all, bulk action bar (enable/disable/delete), bulk delete confirmation dialog
- Found sessions-view.tsx already had: row selection checkboxes, select all, bulk action bar with disconnect button, but disconnect was simulated (toast only, no API call)
- Identified missing features: Change Group dialog, Export Selected, Escape key, real batch API for sessions

### Changes Made

#### 1. Created `/api/users/batch/route.ts` (POST)
- Actions: `enable`, `disable`, `delete`, `changeGroup`
- Validates action, userIds array (max 500), groupId for changeGroup
- Verifies all users exist before operating
- `changeGroup`: Verifies group exists, deletes existing group assignments in transaction, creates new ones
- `delete`: Transaction-based deletion of users + related data (acct, postauth, check, reply, usergroup)
- `enable`/`disable`: Updates user status in transaction
- Returns `{ success, affected, errors? }`

#### 2. Created `/api/sessions/batch/route.ts` (POST)
- Action: `disconnect`
- Validates action, sessionIds array (max 500)
- Finds sessions by sessionId, reports missing ones
- Skips already-stopped sessions with warning in errors array
- Disconnects active sessions in transaction with `Admin-Reset` terminate cause
- Returns `{ success, affected, errors? }`

#### 3. Updated `users-view.tsx`
- **API migration**: Changed from `/api/users/bulk` to `/api/users/batch`
- **New imports**: Added `UsersRound` icon from lucide-react
- **New state**: `changeGroupDialogOpen`, `changeGroupTarget`
- **Enhanced mutation**: Added `changeGroup` action and `groupId` parameter, shows warning toasts for errors
- **New handlers**: `handleBulkChangeGroup(groupId)`, `confirmChangeGroup()`, `handleBulkExportSelected(format)`
- **Change Group Confirmation Dialog**: AlertDialog showing target group name, warning about replacing existing assignments
- **Bulk Action Bar enhancements**:
  - Added "Change Group" dropdown button populated from groups API
  - Added "Export Selected" dropdown with CSV/JSON options
- **Escape key**: `useEffect` listener clears selection and closes dialogs on Escape
- **Existing features preserved**: Row selection, select all/indeterminate, enable/disable/delete buttons, progress spinner, clear button

#### 4. Updated `sessions-view.tsx`
- **New import**: `toast as sonnerToast` from sonner
- **New state**: `bulkDisconnectPending` for loading state
- **New mutation**: `bulkDisconnectMutation` calls `/api/sessions/batch` with real disconnect logic
- **New handler**: `handleBulkExportSelected(exportFormat)` exports only selected sessions
- **Bulk Action Bar enhancements**:
  - "Bulk Disconnect" button now shows loading spinner during pending state
  - Added "Export Selected" dropdown with CSV/JSON options
- **Bulk Disconnect Dialog**: Now calls real API instead of simulating with toast; shows spinner during pending state; disabled while pending
- **Escape key**: `useEffect` listener clears selection and closes dialogs on Escape
- **Existing features preserved**: Row selection, select all, selection counter badge, clear button

### Verification
- ESLint: ✅ Zero errors
- Dev log: ✅ All 200 responses, no compilation errors
- No blue/indigo colors used
- All existing functionality preserved
