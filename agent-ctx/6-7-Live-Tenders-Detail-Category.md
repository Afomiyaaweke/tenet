# Task 6-7: Live Tenders Detail & Category

## Summary
Enhanced the Live Tenders view with in-app detail expansion, dynamic category/sector filtering, and bid linking.

## Changes Made

### 1. In-App Detail View
- Card click expands a comprehensive detail panel below the card
- Shows ALL tender info: title, scope (full text), budget, deadline, location, borrower, contract type, region, source, category tags, external URL
- "Start Bid Application" button saves the tender and navigates to Bids view
- "Import to My Tenders" and "Open Original" buttons
- Quick access to "Load Full Document Content" and "AI Review" from detail view
- Collapsible via card click, "Collapse" button, or "View Details" toggle

### 2. Dynamic Category/Sector Pills
- Replaced static SECTOR_PILLS with dynamic extraction from actual tenders
- Matches known sectors first (with icons), then adds discovered sectors (up to 10)
- Each pill shows actual count from loaded data
- "All" pill shows total tenders count
- Separated from search/source row with border-t visual separator
- Works alongside existing source filter dropdown

### 3. Bid Linking
- "Moved to Bids" toast now has "Go to Bids" action button
- "In Bids" badge on saved tenders clicks navigate to Bids view
- "Start Bid Application" button auto-saves tender then navigates to Bids
- Uses useNavStore.getState().setView('bids', { tenderId }) for navigation with context

## Files Modified
- `src/components/modules/live-tenders.tsx`
