# Task 7-a: Update tenders.tsx and bids.tsx styling to premium UI theme

## Summary
Updated both module view files to match the premium UI theme established by dashboard.tsx and app-shell.tsx. Only visual styling was changed — no functionality or API calls were modified.

## Files Modified
1. `/home/z/my-project/src/components/modules/tenders.tsx`
2. `/home/z/my-project/src/components/modules/bids.tsx`

## Key Changes

### tenders.tsx
- Root div: added `view-enter` class
- Header: gradient-emerald icon container + `text-gradient-emerald` heading accent
- Create button: `gradient-emerald text-white rounded-xl premium-shadow`
- Dialog inputs: `bg-muted/50 rounded-xl`, emerald focus rings
- Category badges: emerald-tinted when selected, muted when not
- Filters: wrapped in `premium-shadow rounded-xl border-0` card
- New stats row: 4 mini stat cards (Open/emerald, Closed/amber, Awarded/teal, Total/rose)
- Tender cards: `premium-shadow rounded-xl border-0 hover:-translate-y-0.5`
- Status icons per state with colored bg-50 containers
- Budget/location/deadline icons with colored backgrounds
- Status badges: open=emerald, closed=rose, awarded=teal, cancelled=gray
- Match score badges: emerald ≥70%, amber ≥40%, gray <40%

### bids.tsx
- Root div: added `view-enter` class
- Header: gradient-amber icon container + `text-gradient-emerald` heading accent
- New stats row: 4 mini stat cards (Pending/amber, Shortlisted/teal, Awarded/emerald, Rejected/rose)
- Bid cards: `premium-shadow rounded-xl border-0 hover:-translate-y-0.5`
- Status-specific icons with colored backgrounds per bid
- Financial/timeline badges with colored tinted backgrounds
- ChevronDown/Up expand indicator
- Expanded sections: icon headers + `bg-muted/50` or `bg-rose-50` content areas
- Admin action buttons: gradient-teal (shortlist), gradient-emerald (award), rose-styled reject
- Empty/loading states with gradient icon containers

## Lint
Passed with zero errors.
