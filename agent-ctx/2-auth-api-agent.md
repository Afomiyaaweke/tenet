# Task 2 - Auth API Agent Work Record

## Task: Update auth system and create company/bid-analysis API routes

## Work Completed:

### 1. Updated `/src/lib/auth.ts`
- Added `companyId` (optional string) to `JwtPayload` interface
- Updated `getAuthUser` to include `company` relation in the user query
- Added `requireSuperAdmin` helper function - checks for `super_admin` role
- Added `requireTeamAdmin` helper function - allows `team_admin` or `super_admin` roles

### 2. Updated `/src/app/api/auth/register/route.ts`
- Company-based registration: accepts `companyName`, `companyIndustry`, `companyTinNumber`, `companyRegistrationNo`, `companyPhone`, `companyCity`, `companyCountry`, `companyEmail`, `companyWebsite`
- Accepts `role` from user with validation (only "user" or "team_admin" for self-registration; "super_admin" requires existing super_admin auth)
- Creates Company first, then User linked to Company, then Profile linked to both
- Returns the full user object with company and profile included
- Token includes `companyId`

### 3. Updated `/src/app/api/auth/login/route.ts`
- Includes `company` relation in the user query
- Returns company info in the response
- Token includes `companyId`

### 4. Updated `/src/app/api/auth/me/route.ts`
- Already inherits `company` relation from updated `getAuthUser`

### 5. Created `/src/app/api/companies/route.ts`
- GET: Lists companies (super_admin sees all with user/profile counts, others see their own only)
- POST: Create company (super_admin only) with duplicate TIN/registrationNo checks

### 6. Created `/src/app/api/companies/[id]/route.ts`
- GET: Get company by ID with users (non-super_admin can only view their own company)
- PUT: Update company (super_admin or team_admin of that company), with duplicate checks and selective field updates

### 7. Created `/src/app/api/companies/[id]/verify/route.ts`
- PATCH: Verify/unverify company (super_admin only), accepts `{ verified: boolean }`

### 8. Created `/src/app/api/bid-analysis/route.ts`
- GET: List bid analyses filtered by optional `tenderId` query param
- POST: Trigger AI analysis using ZAI SDK (same pattern as analyze-applicants), saves result to BidAnalysis table with `summary`, `rankings`, `budgetAnalysis`, `recommendation`, `riskSummary`, `createdBy`

### 9. Created `/src/app/api/bid-analysis/[id]/route.ts`
- GET: Get specific bid analysis with tender relation, parses JSON string fields for convenience

### 10. Updated `/src/app/api/profiles/route.ts`
- Includes `company` in all profile queries
- GET: super_admin sees all, team_admin sees company profiles, user sees own
- Added PUT endpoint to update profile including `companyId` and `jobTitle`
- Updates user's `companyId` when profile `companyId` changes

## Key Results:
- All 10 task items completed
- Lint passes cleanly
- Dev server compiles successfully
