# Task 6 - Profile Roles Agent

## Task: Update profile with role classification and access selection

## Work Completed

### Files Created
- `/home/z/my-project/src/app/api/users/[id]/role/route.ts` — PATCH endpoint for super_admin to change user roles

### Files Updated
- `/home/z/my-project/src/components/modules/profile.tsx` — Complete rewrite with role classification, company info, access levels, and team management
- `/home/z/my-project/worklog.md` — Appended work record

### Key Changes

1. **Company Section** at top of profile showing company name, industry, city/country, TIN, registration number, verification badge, and setup prompt for users without a company

2. **Role & Access Section** with:
   - Super Admin: orange badge with Shield icon, "Full system access"
   - Team Admin: slate badge with Users icon, "Company management"
   - User: gray badge with UserCircle icon, "Standard access"
   - Permissions checklist grid with icons

3. **Profile fields updated**:
   - Added: jobTitle
   - Removed: companyName, type, tinNumber, licenseNumber (moved to Company model)

4. **Team Management Section** (super_admin/team_admin only):
   - Lists team members with role badges
   - super_admin can change roles via Select dropdown
   - Loading states and toast feedback

5. **New API endpoint**: PATCH /api/users/[id]/role (super_admin only)

### Lint & Build Status
- Lint passes cleanly
- Dev server compiles successfully
