# Task 10: Contact Us & Privacy Policy Module Components

## Summary
Created two new module components (Contact Us and Privacy Policy) and a Privacy Policy PDF API route, integrated into the app shell navigation.

## Files Created
1. `/home/z/my-project/src/components/modules/contact-us.tsx` (406 lines)
2. `/home/z/my-project/src/components/modules/privacy-policy.tsx` (587 lines)
3. `/home/z/my-project/src/app/api/privacy-policy/pdf/route.ts` (23 lines)

## Files Modified
1. `/home/z/my-project/src/store/index.ts` — Added 'contact-us' and 'privacy-policy' to View type
2. `/home/z/my-project/src/components/app-shell.tsx` — Added dynamic imports, SUPPORT nav section, and view cases

## Component Details

### Contact Us (ContactUsView)
- Contact form with Name, Email, Subject, Message fields + Submit button
- Contact Info Cards (Email, Location, Business Hours, Website)
- FAQ Section with collapsible accordion (4 questions)
- Two-column layout on desktop (5/3 split), single column on mobile
- Orange/slate color scheme with dark mode support
- Uses shadcn/ui: Card, Button, Input, Textarea, Label, Badge, Accordion
- Uses Lucide: Mail, Phone, MapPin, Send, Clock, Globe, MessageSquare

### Privacy Policy (PrivacyPolicyView)
- 16 sections displayed with proper typography and numbered headers
- Sticky left sidebar navigation (collapses on mobile with toggle)
- IntersectionObserver-based active section tracking
- Download PDF button linking to `/api/privacy-policy/pdf`
- Orange accent colors, dark mode support, responsive
- Uses shadcn/ui: Card, Button, Badge, Separator, ScrollArea

### Privacy Policy PDF API Route
- GET `/api/privacy-policy/pdf` — Returns Termly.pdf with proper headers
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="Tenet_Privacy_Policy.pdf"
- Cache-Control: public, max-age=86400
- 404 response if PDF not found

## Navigation Integration
- Added SUPPORT section to sidebar with Contact Us and Privacy Policy items
- Available to all user roles (super_admin, team_admin, user)
- Uses Mail and Lock icons from Lucide

## Verification
- Lint: Passes cleanly (no errors)
- Dev server: Compiles successfully
- API route: Returns 200 with correct headers and PDF content
