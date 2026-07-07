# Task 8: Update App Shell for Role-Based Navigation and Access Control

## Agent: appshell-roles-agent

## Summary
Updated `/home/z/my-project/src/components/app-shell.tsx` to support role-based navigation, company display, and emerald-to-orange/slate color migration.

## Changes Made

### 1. Role-Aware Navigation
- Replaced static `NAV_ITEMS` with `getNavItemsForRole(role)` function
- **super_admin**: MAIN + MANAGE + TOOLS + ADMIN (Shield icon)
- **team_admin**: MAIN + MANAGE + TOOLS + TEAM (Building2 icon, Company Settings)
- **user**: MAIN + TOOLS only

### 2. Role Badge System
- Added `ROLE_BADGE_CONFIG` with per-role colors:
  - super_admin: orange (bg-orange-100 text-orange-700)
  - team_admin: slate (bg-slate-100 text-slate-700)
  - user: gray (bg-gray-100 text-gray-600)
- All with dark mode variants

### 3. Sidebar User Card
- Shows company name below user name
- Role badge replaces old "Member" badge
- Company initial avatar (orange circle, bottom-left of user avatar)

### 4. Top Bar User Dropdown
- Role badge next to user name
- Company name with Building2 icon below email
- Administration link for super_admin only

### 5. Color Migration (emerald → orange/slate)
- Avatar: bg-slate-700 + shadow-slate-200
- Verified: bg-orange-500, text-orange-600
- Notifications: text-orange-500, bg-orange-50
- Notification dot: bg-orange-500, ring-orange-100
- Upgrade card: bg-orange-600, shadow-orange-200

### 6. View Type Updates
- Added 'bid-analysis' to View type
- Added renderView() case for bid-analysis (falls back to BidsView)
- Added bid-analysis to breadcrumb logic under Tenders

### 7. Other
- Imported Shield, Building2 from lucide-react
- Changed default role from 'contractor' to 'user'
- Used useMemo for navSections computation
- Passed company prop through SidebarContent

## Files Modified
- `/home/z/my-project/src/components/app-shell.tsx` — Complete rewrite of navigation, sidebar, and color system
- `/home/z/my-project/worklog.md` — Appended task record

## Verification
- `bun run lint` passes cleanly (no errors)
- Dev server compiles successfully (confirmed via dev.log)
