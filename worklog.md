---
Task ID: 1
Agent: Main
Task: Fix preview not working and remove placeholder content

Work Log:
- Investigated dev server stability - server gets OOM killed due to 4GB RAM limit
- Fixed comment section toasts: replaced `useToast` (shadcn/ui) with `toast` from sonner
- Fixed admin panel data mismatch: Profile[] vs User[] - now correctly accesses nested user.email and user.role
- Fixed external tender stubs: added "Coming Soon" error messages for 6 unimplemented adapters
- Updated live tenders UI to show "Coming Soon" badge for unavailable sources
- Verified lint passes and code compiles
- Both Next.js (port 3000) and chat service (port 3003) are running
- Caddy gateway (port 81) correctly proxies to Next.js
- Preview returns correct page: <title>Tenets - Tender Ecosystem</title>

Stage Summary:
- Runtime bugs fixed: comment toasts, admin data access, external tender stubs
- Preview works via Caddy gateway on port 81
- Dev server may be killed by OOM in low-memory conditions; restarts needed
- Production build available for lower memory usage
