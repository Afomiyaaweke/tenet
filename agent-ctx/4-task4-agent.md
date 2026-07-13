# Task 4 — Enhance Tenders View Load More Pagination and Data Loading

## Summary
All 5 requested changes were made surgically to the codebase with zero lint errors.

## Changes Made

### 1. `src/components/modules/tenders.tsx` — LIMIT 20 → 30
- Line 566: `const LIMIT = 20` → `const LIMIT = 30`

### 2. `src/components/modules/tenders.tsx` — Tenders Load More section (lines ~1455-1520)
- Progress bar: `max-w-md` → `max-w-lg`, `h-1.5` → `h-2`
- Button: `min-w-[240px]` → `min-w-[280px]`, added `h-12 shadow-sm font-medium`
- Added `+{count}` Badge on button (shows `+30` or remaining count)
- Added subtitle: "X more tenders available"
- Completion state: `text-xs` → `text-sm font-medium`, icon `h-3` → `h-4`, added "You've reached the end" subtitle

### 3. `src/components/modules/tenders.tsx` — External Tenders Load More section (lines ~1890-1964)
- Same improvements as above: wider progress bar, prominent button, count badge (+100), subtitle, improved completion state

### 4. `src/components/modules/tenders.tsx` — loadExternalTenders rows
- Line 684: `rows: '50'` → `rows: '100'`

### 5. `src/app/api/tenders/route.ts` — Default limit and max
- Line 107: `parseInt(searchParams.get('limit') || '10', 10)` → `Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)`
- Default: 10 → 20, Max: unlimited → 100

## Verification
- `bun run lint` passes with zero errors
