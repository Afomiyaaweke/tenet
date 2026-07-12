# Task 4 - Add Remove Button and AI Prompt Writer to Doc Review Tab

## Summary
Added two major features to the AI Doc Studio's Doc Review tab:

### 1. Remove/Delete Button
- **Left Panel**: Small Trash2 icon button on each document card header (next to expand chevron)
- **Right Detail View**: "Remove Document" button at bottom-right with rose styling
- Both use `confirm()` dialog before calling `DELETE /api/documents/[docId]`
- On success: refreshes document list via `loadDocuments()`
- On right panel: also clears `selectedDocId`

### 2. AI Prompt Writer (Extract Feature)
- **Left Panel** (expanded card section): "AI Extract" toggle button, prompt input, quick suggestions, extract button, results with copy
- **Right Detail View**: Full "AI Prompt Writer — Extract Information" collapsible panel with:
  - Prompt input with Enter key support and inline Extract button
  - 5 quick prompt suggestions (financial figures, deadlines, requirements, contact info, compliance issues)
  - Active-state highlighting for selected quick prompt
  - Scrollable extracted info display (max-h-[300px]) with Copy button
- Only visible when OCR is completed on the document
- Calls `POST /api/documents/ai-extract` with `{ documentId, prompt }`

### State Variables Added
- `extractPrompt: Record<string, string>` — per-document prompt text
- `extractLoading: Set<string>` — per-document loading state
- `extractResults: Record<string, string>` — per-document extraction results
- `showExtract: Set<string>` — per-document panel visibility toggle

### Icons Added
- `Trash2` from lucide-react
- `MessageSquare` from lucide-react

### Files Modified
- `src/components/modules/ai-doc-studio.tsx` — All changes in this single component file

### Quality Checks
- Lint: 0 errors, 1 pre-existing warning (unrelated)
- Dev server: compiles successfully
