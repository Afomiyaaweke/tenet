---
Task ID: 1
Agent: Main Agent
Task: Company-scoped data isolation, Staff Management, Contact Us, Privacy Policy modules

Work Log:
- Updated Prisma schema: added `companyId` to Tender, Project, Task models
- Added `assigneeId` to Task for task assignment within company
- Added relations: Company→tenders, Company→projects, Company→tasks, User→assignedTasks
- Ran `db:push` to apply schema changes
- Updated 22+ API routes for company-scoped data isolation:
  - Tenders: company filter + open tenders visible to all
  - Projects: filtered by user's companyId
  - Tasks: filtered by user's companyId
  - Bids: team_admin sees company bids, user sees own bids
  - Bid Analysis: filtered by company's tenders
  - AI routes: company access checks
  - Agent route: company-isolated stats
- Created Staff Management module:
  - API: GET /api/staff (list company users), PATCH /api/staff/[id] (update role/status)
  - Component: StaffView with stats cards, member table, role badges, search/filter, actions dropdown
  - Added to sidebar for team_admin and super_admin
- Created Contact Us module:
  - Component: ContactUsView with form, FAQ accordion, contact info cards
  - API: POST /api/contact (stores messages)
  - Added to SUPPORT sidebar section for all roles
- Created Privacy Policy module:
  - Component: PrivacyPolicyView with 16 sections, sticky sidebar nav, PDF download
  - API: GET /api/privacy-policy/pdf (serves Termly.pdf)
  - Added to SUPPORT sidebar section for all roles
- Fixed missing JWT_SECRET in .env file
- Updated navigation: added Staff (TEAM/ADMIN), Contact Us (SUPPORT), Privacy Policy (SUPPORT)
- Updated store: added 'staff', 'contact-us', 'privacy-policy' to View type
- All lint checks pass, dev server compiles without errors

Stage Summary:
- Company isolation fully implemented across all data models and API routes
- Staff Management module complete with role management and search/filter
- Contact Us page with form, FAQ, and contact info
- Privacy Policy page with full content from Termly.pdf and PDF download
- All new sidebar items properly integrated for all user roles
---
Task ID: 2
Agent: Main Agent
Task: Fix preview, rename Tenets to Tenet, remove Z AI tags, add stamp/signature, favicon, security audit

Work Log:
- Renamed Tenets to Tenet across 21+ files
- Created favicon.svg matching Tenet logo
- Replaced all space-z.ai URLs with tenet.app
- Created shared stamp-signature.tsx with useStampSignature hook
- Added stamp/signature to Profile, Tender Detail, Bids, Documents, AI Doc Studio
- Security audit: JWT, rate limiting, security headers, password validation
- Lint passes, server runs correctly

