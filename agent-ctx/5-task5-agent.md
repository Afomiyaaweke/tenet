# Task 5: Enhance External Tender Data Sources with documentFiles

## Summary
Enhanced 6 external tender data source adapters to include `documentFiles` entries with downloadable requirement documents and RFP files. Also replaced the Portugal BASE stub with a real API implementation.

## Changes Made

### 1. Colombia SECOP Adapter (line ~1609)
- Added `documentFiles` array extracting from `urlproceso` and `url_documentos` fields
- Entries: "Process Documents" (HTML) and "Contract Documents" (HTML)
- Filtered to only include entries with valid URLs
- Updated `documentUrl` to fallback to first documentFiles URL

### 2. Mexico CompraNet Adapter (line ~1689)
- Mapped ALL `tender.documents` from OCDS format to `documentFiles` entries
- Each document mapped with title/description, format (uppercased), and url
- Filtered to only include entries with valid URLs
- Updated `documentUrl` to fallback to first documentFiles URL

### 3. Chile Mercado Público Adapter (line ~1771)
- Added `documentFiles` array extracting from `UrlDocumento` and `UrlPublica` fields
- Entries: "Tender Documents" (PDF) and "Public Page" (HTML)
- Updated `documentUrl` to fallback to first documentFiles URL

### 4. Argentina COMPR.AR Adapter (line ~1848)
- Mapped ALL `tender.documents` from OCDS format to `documentFiles` entries
- Same pattern as Mexico CompraNet
- Updated `documentUrl` to fallback to first documentFiles URL

### 5. Uruguay Compras Adapter (line ~1925)
- Added `documentFiles` array extracting from `url_documento` and `url_pliego` fields
- Entries: "Bidding Documents" (PDF) and "Tender Terms (Pliego)" (PDF)
- Updated `documentUrl` to fallback to first documentFiles URL

### 6. Portugal BASE Adapter (line ~1278)
- Replaced stub with full API implementation
- Fetches from `https://www.base.gov.pt/api/Contratos` with pagination
- Added `offset` parameter to function signature
- Extracts contract data with proper field mapping
- Includes `documentFiles` with Contract Documents entries
- Updated fetchLiveTenders call to include offset parameter

### 7. DATA_SOURCES Array Descriptions
- Updated all 6 source descriptions to prominently mention "downloadable requirement documents and RFP files"

### 8. generateSampleTenders
- Added `mexico_compranet`, `argentina_comprar`, `uruguay_compras` to sources array (21 total)
- Added docUrls for all 3 new sources

## Verification
- `bun run lint` passed with zero errors
- Dev server running successfully on port 3000
