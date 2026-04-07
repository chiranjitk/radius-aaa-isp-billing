# Task 23 - User Registration, KYC, Documents, Profile Photo, Selfcare Portal

## Completed: 2026-04-07

### What was built:

#### 1. API Routes (5 files)
- **`/api/registrations/route.ts`** — GET (list with search/filter/pagination) + POST (submit new registration)
- **`/api/registrations/[id]/route.ts`** — GET (single) + PUT (approve creates RadUser, reject with reason)
- **`/api/users/[id]/documents/route.ts`** — GET (list) + POST (upload as base64 data URL)
- **`/api/users/[id]/photo/route.ts`** — GET + PUT (base64 profile photo)
- **`/api/users/[id]/kyc/route.ts`** — GET (status + document summary) + PUT (update KYC status/ID info)

#### 2. Frontend Components (3 new files)
- **`registrations-view.tsx`** — Admin registration management table with:
  - Stats overview cards (total/pending/completed/rejected)
  - Search, filter by status, pagination
  - Approve/Reject actions (reject requires reason dialog)
  - New Registration dialog
  - Registration detail dialog

- **`user-kyc-panel.tsx`** — Reusable KYC & Documents panel for user detail sheet:
  - KYC status badge + progress steps (pending → submitted → verified)
  - Profile photo upload with circular Avatar preview
  - Document upload area (drag-drop, type selector)
  - Documents table with type icons, status badges, approve/reject actions
  - Quick KYC verify button

- **`selfcare-portal.tsx`** — End-user selfcare portal (demo/simulated):
  - User header with photo, name, plan, status badges
  - 7 sections: Profile, Subscription, Password, Sessions, Invoices, Documents, Service Status
  - Edit profile form, change password, bandwidth usage progress
  - Simulated data for demonstration

#### 3. Enhanced existing files:
- **`users-view.tsx`** — User edit dialog now includes:
  - City, State, Zip Code, Country fields
  - Date of Birth, Gender, ID Type, ID Number fields
  - IP Type selector (Dynamic/Static/Pool) with conditional Static IP input
  - All new fields sent in create/update payload
  - New "KYC" tab in user detail sheet using `UserKycPanel`

- **`store.ts`** — Added `'selfcare'` to ViewId type
- **`app-sidebar.tsx`** — Added Registrations and Selfcare Portal nav items in System section
- **`page.tsx`** — Added imports, view titles, view rendering for registrations + selfcare
- **`command-palette.tsx`** — Added "Go to Registrations" and "Go to Selfcare Portal" commands

### Design:
- No indigo/blue — uses amber (pending), emerald (approved/verified), red (rejected), sky (submitted)
- Uses glass-card, card-hover, animate-fade-in-up CSS classes
- Document type icons: CreditCard (id_proof), MapPin (address_proof), Camera (photo), FileText (contract)
- Profile photo: circular Avatar with Camera overlay on hover
- All responsive with mobile-first design

### Lint: ✅ Clean (0 errors, 0 warnings)
