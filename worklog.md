---
Task ID: 1
Agent: Main
Task: Implement rate limiter with 3-tier premium plan system (Free, Pro, Enterprise) and include it on dashboard

Work Log:
- Explored full codebase structure (Prisma schema, dashboard, app-shell, API routes, store, auth)
- Designed 3-tier plan system: Free ($0), Pro ($29/mo), Enterprise ($99/mo) with differentiated rate limits
- Updated Prisma schema: added `plan` field to User model, created Subscription and UsageRecord models
- Ran `prisma db push` to sync schema with SQLite database
- Created `src/lib/rate-limiter.ts` with:
  - PLAN definitions (limits, features, pricing for each tier)
  - Per-plan rate limit enforcement (checkRateLimit, enforceRateLimit)
  - Rate limit headers generation (X-RateLimit-Limit, X-RateLimit-Remaining, etc.)
  - Usage summary tracking for dashboard display
  - Endpoint categorization (ai, documents, bids, tenders, chat, social, auth, api_general)
- Created API routes:
  - `src/app/api/plans/route.ts` (GET: fetch plans + usage, POST: upgrade/downgrade)
  - `src/app/api/plans/usage/route.ts` (GET: current usage stats)
- Created pricing plans view component `src/components/modules/pricing-plans.tsx` with:
  - Current plan summary card with usage bars
  - 3 pricing cards (Free, Pro, Enterprise) with features and rate limits
  - Feature comparison table
  - FAQ section
  - Upgrade confirmation dialog
- Added plan card to dashboard (`src/components/modules/dashboard.tsx`) showing current plan and upgrade button
- Updated app-shell sidebar: added "Subscription" nav item with Star icon (visible for all users)
- Added dynamic import for PricingPlansView, View type, and case rendering
- Updated auth store View type to include 'pricing-plans'
- Updated User interface in api.ts to include `plan` field
- Updated AuthUser type in auth.ts to include `plan` field
- Added auth cache invalidation after plan upgrade (invalidateAuthCache)
- Integrated rate limiting into key API routes:
  - `/api/ai/bid-prep/route.ts` (AI calls)
  - `/api/tenders/route.ts` (tender creation)
  - `/api/bids/route.ts` (bid submission)
  - `/api/documents/route.ts` (document upload)
- Lint check: 0 errors, 5 warnings (pre-existing unused eslint-disable directives)
- Browser verification: Dashboard shows "Free Plan" card with "Upgrade to Pro" button, Subscription page shows all 3 plans with feature comparison and rate limits

Stage Summary:
- Complete 3-tier subscription plan system implemented with Free, Pro ($29/mo), Enterprise ($99/mo)
- Per-plan rate limiting enforced on AI, tender, bid, and document API routes
- Dashboard shows current plan card with upgrade CTA
- Pricing Plans page with full comparison, usage tracking, and upgrade flow
- Sidebar "Subscription" nav item visible for all user roles
