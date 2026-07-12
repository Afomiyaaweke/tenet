# Task 2-3: Bids Draft Tab + AI Extract Uploader

## Work Summary

### Part A: Drafted Tab in Bids
- Added `drafted` to BidTab type union
- Implemented `isDrafted()` helper function that checks: status === 'pending_review' AND (financialProposal is 0/null OR technicalProposal includes "Pending document upload" OR timeline includes "Pending document upload")
- Added drafted count to stats
- Drafted tab appears between Pending and Shortlisted with PenLine icon and sky color theme
- Drafted bid cards have sky-themed accent strip, status badge, and icon styling
- "Continue" button on drafted cards expands the bid to show document upload areas
- Stats grid updated: Pending, Drafted, Shortlisted, Awarded

### Part B: PDF Uploader in AI Extract
- Added dashed-border upload zone at top of AI Extract left panel
- Supports .pdf, .doc, .docx, .png, .jpg files (max 10MB)
- Uses existing `/documents` API with docType='external_doc' and autoOcr=true
- Auto-triggers OCR after upload and polls for completion
- Shows progress states (Uploading → Starting OCR → OCR processing)
- Auto-selects document for extraction when OCR completes

### Part C: Export Methods
- Added `exportAsTxt()`, `exportAsPdf()`, `exportExtractAsPdf()` helper functions
- TXT export: Blob download with text/plain content type
- PDF export: Opens styled HTML in new window with auto-print
- Export buttons added to:
  - Doc Review OCR text display (Copy + TXT + PDF)
  - Doc Review AI Extract results (Copy + TXT + PDF)
  - AI Extract tab extract results (Copy + TXT + PDF)
  - AI Extract extraction history entries (Copy + TXT + PDF)
  - AI Extract OCR Text Source (Copy + TXT + PDF)

## Files Modified
- `/home/z/my-project/src/components/modules/bids.tsx` - Drafted tab, filter, styling
- `/home/z/my-project/src/components/modules/ai-doc-studio.tsx` - Upload area, export helpers, export buttons

## Lint Status
- All checks pass, dev server compiles cleanly
