# Security Audit Report — Tenet Tender Ecosystem

**Date:** 2025-03-04  
**Auditor:** Security Agent  
**Project:** /home/z/my-project (Next.js 16 + Prisma + SQLite)

---

## Executive Summary

A comprehensive security audit was performed on the Tenet Tender Ecosystem Next.js application. **9 critical/high issues** were identified and **all were fixed**. The application had several production-readiness gaps including a weak JWT secret, missing security headers, no rate limiting, no middleware, and insufficient input validation. All fixes have been applied and the dev server is running cleanly with no lint errors.

---

## Findings & Fixes

### 🔴 CRITICAL — Fixed

#### 1. Weak JWT_SECRET in `.env`
- **File:** `.env`
- **Issue:** JWT_SECRET was `tenet-ecosystem-jwt-secret-key-2024-secure` — a predictable, dictionary-like string easily guessed by attackers. This would allow token forgery and full account takeover.
- **Fix:** Replaced with a 64-byte cryptographically random base64 string generated via `openssl rand -base64 64`. Also added a minimum length check (32+ chars) in `auth.ts`.

#### 2. Missing Security Headers in `next.config.ts`
- **File:** `next.config.ts`
- **Issue:** No security headers were configured — the application was vulnerable to clickjacking (no X-Frame-Options), MIME-type sniffing (no X-Content-Type-Options), and had no Content-Security-Policy.
- **Fix:** Added comprehensive security headers:
  - `X-Frame-Options: DENY` — prevents clickjacking
  - `X-Content-Type-Options: nosniff` — prevents MIME sniffing
  - `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
  - `Strict-Transport-Security` — enforces HTTPS (63072000s + preload)
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables unnecessary APIs
  - `X-XSS-Protection: 1; mode=block` — XSS filter
  - `Content-Security-Policy` — restricts script/style/img/connect sources
- **Also:** Enabled `reactStrictMode: true` (was `false`)

#### 3. No Middleware — No Rate Limiting or CORS
- **File:** `src/middleware.ts` (did not exist)
- **Issue:** The application had no middleware for API route protection. No rate limiting on any endpoints, making the login endpoint vulnerable to brute-force attacks and the contact/comments endpoints vulnerable to spam.
- **Fix:** Created `src/middleware.ts` with:
  - **In-memory rate limiting** per IP with sliding window:
    - `/api/auth/login`: 5 req/min
    - `/api/auth/register`: 3 req/min
    - `/api/contact`: 3 req/min
    - `/api/comments`: 10 req/min
    - `/api/agent`: 10 req/min
    - `/api/ai/*`: 5 req/min
  - Returns HTTP 429 with `Retry-After` header when limit exceeded
  - **CORS headers** for API routes (same-origin + localhost)
  - Periodic cleanup of expired rate limit entries

#### 4. JWT Token Expiry Too Long (7 days)
- **File:** `src/lib/auth.ts`
- **Issue:** JWT tokens were valid for 7 days, creating a large window for token theft/exploitation.
- **Fix:** Reduced JWT expiry from `7d` to `24h`. Also added a minimum length validation for JWT_SECRET (must be ≥32 chars).

---

### 🟠 HIGH — Fixed

#### 5. No Password Strength Validation on Registration
- **File:** `src/app/api/auth/register/route.ts`
- **Issue:** Users could register with any password (e.g., "1" or "a"), making accounts trivially brute-forceable.
- **Fix:** Added `validatePassword()` function requiring:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number

#### 6. Anyone Could Self-Register as `team_admin`
- **File:** `src/app/api/auth/register/route.ts`
- **Issue:** The registration endpoint allowed any user to set their role to `team_admin` without admin authorization. This gave unauthenticated users admin-level access to the platform.
- **Fix:** Role assignment now requires authorization:
  - `user` role: available for self-registration ✅
  - `team_admin`: requires existing admin (team_admin or super_admin) authorization ✅
  - `super_admin`: requires existing super_admin authorization with double-check ✅

#### 7. Comments Auto-Approved Without Review
- **File:** `src/app/api/comments/route.ts`
- **Issue:** The POST endpoint was public (no auth), auto-approved all comments (`approved: true`), and accepted arbitrary roles. This allowed spam, abuse, and impersonation.
- **Fix:**
  - Changed `approved: false` — all comments require admin review
  - Fixed role validation to use schema-defined values (`contractor`, `tender_owner`, `admin`, `other`)
  - Added email regex validation (was only checking for `@`)
  - Added max length limits (name: 100, content: 2000, email: 200)
  - Rate limited via middleware (10 req/min)

#### 8. Comment Moderation Endpoint Required Only Basic Auth
- **File:** `src/app/api/comments/[id]/route.ts`
- **Issue:** Any authenticated user (including regular `user` role) could toggle `featured` and `approved` flags on any comment.
- **Fix:** Changed from `requireAuth` to `requireTeamAdmin` — only admins can moderate comments.

#### 9. No Input Validation on Login Endpoint
- **File:** `src/app/api/auth/login/route.ts`
- **Issue:** No type or length checking on email/password inputs. Extremely long strings could cause excessive bcrypt computation (DoS vector).
- **Fix:** Added type checking and 200-character length limits on both email and password.

---

### 🟡 MEDIUM — Noted (Not Fixed, Requires Design Decision)

#### 10. No Email Verification Flow
- Users can register and immediately use the platform without verifying their email. This enables disposable email abuse.
- **Recommendation:** Implement email verification with a confirmation token sent via email.

#### 11. No Refresh Token Mechanism
- With JWT expiry reduced to 24h, users will be logged out daily. There's no refresh token mechanism.
- **Recommendation:** Implement refresh tokens stored in HttpOnly cookies with rotation.

#### 12. File Upload MIME Type Spoofing
- **Files:** `src/app/api/documents/route.ts`, `src/app/api/profiles/upload-photo/route.ts`
- The MIME type check (`file.type`) is client-supplied and can be spoofed. The extension check is good but insufficient.
- **Recommendation:** Validate file magic bytes/signatures server-side using a library like `file-type`.

#### 13. Profile Update Allows Arbitrary URL Injection
- **File:** `src/app/api/profiles/[id]/route.ts`
- `logoUrl` and `profilePhoto` fields accept arbitrary strings, enabling SSRF or phishing via malicious URLs.
- **Recommendation:** Validate URL format and restrict to allowed domains/patterns.

#### 14. Error Logging in Production
- Multiple routes use `console.error(error)` which could leak stack traces in production logs.
- **Recommendation:** Use a structured logging library that sanitizes sensitive data in production.

---

### 🟢 LOW — Noted

#### 15. `dangerouslySetInnerHTML` in chart.tsx
- **File:** `src/components/ui/chart.tsx`
- Used for CSS theme injection. The content is derived from static `THEMES` constants, not user input, so XSS risk is minimal.

#### 16. bcrypt vs argon2id
- Password hashing uses bcrypt with cost factor 12, which is adequate. Argon2id would be more resistant to GPU-based attacks but requires native dependencies.
- **Recommendation:** Consider migrating to argon2id when native build support is available.

#### 17. No `.env.example` File
- Missing `.env.example` makes it harder for developers to know required environment variables.
- **Recommendation:** Create `.env.example` with `DATABASE_URL=` and `JWT_SECRET=` (no actual values).

#### 18. SQLite in Production
- SQLite is not ideal for concurrent production workloads. The `DATABASE_URL` uses a file path which may have permission issues.
- **Recommendation:** Consider PostgreSQL for production deployment.

---

## Files Modified

| File | Change |
|------|--------|
| `.env` | Replaced weak JWT_SECRET with 64-byte random base64 string |
| `next.config.ts` | Added 8 security headers, enabled reactStrictMode |
| `src/middleware.ts` | **NEW** — rate limiting + CORS for API routes |
| `src/lib/auth.ts` | JWT expiry 7d→24h, added JWT_SECRET min-length check |
| `src/app/api/auth/register/route.ts` | Password validation, email validation, restricted team_admin role |
| `src/app/api/auth/login/route.ts` | Input type/length validation |
| `src/app/api/comments/route.ts` | Disabled auto-approve, email regex, length limits, fixed role values |
| `src/app/api/comments/[id]/route.ts` | Changed requireAuth→requireTeamAdmin |
| `src/app/api/contact/route.ts` | Added email validation, length limits, input trimming |

---

## Security Posture Summary

| Category | Before | After |
|----------|--------|-------|
| JWT Secret | ❌ Weak/predictable | ✅ 64-byte random |
| Security Headers | ❌ None | ✅ 8 headers (CSP, HSTS, etc.) |
| Rate Limiting | ❌ None | ✅ 6 endpoint-specific limits |
| CORS | ❌ Unrestricted | ✅ Same-origin + localhost |
| Password Policy | ❌ Any password | ✅ 8+ chars, upper/lower/digit |
| Admin Registration | ❌ Open self-registration | ✅ Requires admin auth |
| Comment Moderation | ❌ Auto-approve | ✅ Requires admin review |
| JWT Expiry | ❌ 7 days | ✅ 24 hours |
| Middleware | ❌ None | ✅ Rate limit + CORS |

---

## Remaining Recommendations (Priority Order)

1. **Implement refresh tokens** — Critical for UX with 24h JWT expiry
2. **Add email verification flow** — Prevents disposable email abuse
3. **Validate file magic bytes** — Prevents MIME type spoofing on uploads
4. **Sanitize URL inputs** — Prevents SSRF via profile photo/logo URLs
5. **Create `.env.example`** — Developer documentation
6. **Migrate to PostgreSQL** — For production concurrency
7. **Add CSRF tokens** — If switching to cookie-based auth
8. **Implement audit logging** — Track admin actions for compliance
