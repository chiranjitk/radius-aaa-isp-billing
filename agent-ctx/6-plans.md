# Task 6-plans — Billing Plans Module

## Summary
Created the complete Billing Plans module consisting of 3 files:

## Files Created

### 1. `/home/z/my-project/src/app/api/plans/route.ts`
- **GET**: List plans with search (name/description), planType filter, billingCycle filter, status filter, pagination (page/limit). Includes `_count.subscriptions` and `_count.policyGroups`. Also returns `typeCounts` grouped by planType for the summary cards.
- **POST**: Create plan with all fields (name, description, planType, billingCycle, price, currency, dataLimit, timeLimit, speedDown, speedUp, simultaneous, priority, trialDays, gracePeriodDays, policyIds). Validates required fields. Creates PlanPolicyGroup links if policyIds provided.

### 2. `/home/z/my-project/src/app/api/plans/[id]/route.ts`
- **GET**: Get single plan with full relations — policyGroups (with policy + rules), subscriptions (with user info), _count.
- **PUT**: Update plan fields. Handles policy group replacement if policyIds provided (delete old, create new).
- **DELETE**: Delete plan after checking for active subscriptions/invoices. Returns 409 if plan has dependencies. Deletes PlanPolicyGroup links first.

### 3. `/home/z/my-project/src/components/aaa/plans-view.tsx`
Full-featured client component with:
- **Header**: Title + subtitle + Create Plan and Compare buttons
- **Plan Type Summary Cards** (4 cards): Time-Based (teal), Data-Based (purple), Flat-Rate (emerald), Hybrid (amber) — clickable to filter
- **Filter Bar**: Search input, Plan Type/Billing Cycle/Status dropdowns
- **Plans Grid** (responsive 1/2/3 cols): Cards with name, type badge, status badge, price display, features (speed up/down, data limit, time limit, simultaneous sessions, trial days), subscriber count, priority, actions (Edit, Manage Policies, View Subscribers, Delete). Visual badges for Premium (priority≥10) and Popular (flat-rate with ≥3 subscribers).
- **Plan Comparison**: Toggle comparison mode, select up to 4 plans, side-by-side feature comparison table
- **Create/Edit Dialog**: Multi-tab dialog with Basic Info (name, desc, type, cycle, price, currency), Limits (data/time sliders, simultaneous), Bandwidth (up/down sliders + quick presets), Advanced (priority, trial, grace period, active switch), Policies (multi-select checkbox list)
- **Delete Confirmation**: AlertDialog with subscriber count warning
- Uses: useQuery, useMutation, toast (sonner), shadcn/ui components (Card, Dialog, Badge, Input, Select, Switch, Slider, Tabs, Button, Label, Separator, Checkbox, ScrollArea, Skeleton, Textarea, AlertDialog)
- Helper formatters: formatSpeed (Kbps→Gbps/Mbps), formatData (MB→TB/GB), formatPrice (with cycle), formatTime (minutes→days/hours)
- Loading skeletons, empty states, pagination
- No indigo/blue colors used

## Status
- All lint checks pass ✅
- DB schema pushed ✅
- Production-ready
