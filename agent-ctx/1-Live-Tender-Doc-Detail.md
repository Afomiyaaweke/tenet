# Task 1: Live Tender Doc Detail

## Summary
Redesigned the live tenders detail view to prioritize actual document content over metadata classification.

## Changes Made
- **File**: `/home/z/my-project/src/components/modules/live-tenders.tsx`
- Added prominent "Tender Document Content" section as the FIRST item in detail view (lines ~1052-1222)
  - Load Document Content button
  - Loading skeleton state
  - Error state with retry
  - Full document content display (sections or raw text, max-h-96 scroll)
  - Copy button, metadata pills, inline translator
- Added inline "AI Review & Analysis" section as SECOND item (lines ~1224-1434)
  - Full AI review rendered inline (summary, requirements, eligibility, risks, readiness, tips)
  - Run AI Review toggle button
  - Loading/empty states
- Moved metadata/classification to "Tender Classification & Details" section BELOW content (lines ~1436-1578)
- Prevented duplication: standalone InlineDocumentViewer and AIReviewPanel hidden when detail view is open
  - `isExpanded && !isDetailOpen` for inline doc viewer
  - `showAiReview && !isDetailOpen` for AI review panel
- Removed redundant quick-access buttons from detail view footer

## No new files or API routes needed — all using existing infrastructure
