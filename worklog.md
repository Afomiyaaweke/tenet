---
Task ID: 1
Agent: Main
Task: Fix client-side exception and add tender/bid comparison feature

Work Log:
- Checked dev server status - was already running on port 3000
- Verified app was loading correctly via curl test
- Identified that no client-side exception was present (previous session issue was resolved)
- Created comprehensive tender-compare.tsx component with two views:
  1. TenderCompareView - for contractors to compare multiple tenders side-by-side
  2. BidCompareView - for admin/tender_owners to compare bids on their tenders
- Updated store/index.ts to add 'tender-compare' and 'bid-compare' view types
- Updated tenders.tsx with comparison checkboxes on each tender card and floating compare bar
- Updated tender-detail.tsx with "Compare Bids" button for admin/owner users
- Updated app-shell.tsx to register new views, update router, sidebar active states, and breadcrumbs
- Fixed ESLint errors (set-state-in-effect warnings)
- All lint checks pass

Stage Summary:
- Tender comparison feature fully implemented with side-by-side comparison table
- Bid comparison feature fully implemented with selection + comparison table
- Both features include visual charts (budget bars, deadline bars)
- Quick insights cards highlight best budget, most time, most bids, best match
- Floating comparison bar in tenders list for easy selection
- App compiles and runs successfully
