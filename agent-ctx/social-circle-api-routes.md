# Task: Social Circle API Routes

## Summary
Created 7 API route files for the Social Circle feature in the Next.js 16 project. All routes follow existing codebase patterns: `requireAuth` for auth, `{ success: true/false, data/error }` response format, Prisma includes for relations, and proper TypeScript typing.

## Files Created

1. **`/home/z/my-project/src/app/api/social/posts/route.ts`**
   - `GET` — List social feed with pagination (page, limit), authorId filter, tags filter; visibility-aware (public, connections-only, own posts); includes author profile, company, reaction summary, comment count
   - `POST` — Create post with content, imageUrls (max 10), tags, visibility (public/connections/private); content max 5000 chars

2. **`/home/z/my-project/src/app/api/social/posts/[id]/route.ts`**
   - `GET` — Single post with full details and visibility check
   - `DELETE` — Delete own post only (403 for others)
   - `PATCH` — Toggle reaction (like/unlike): if user already reacted with same emoji → remove & decrement likes; otherwise → add & increment likes; returns updated post with reaction summary and `toggled` boolean

3. **`/home/z/my-project/src/app/api/social/posts/[id]/comments/route.ts`**
   - `GET` — Paginated comments for a post (asc order), includes user profile + company
   - `POST` — Add comment with content (max 2000 chars); increments post comment count via transaction

4. **`/home/z/my-project/src/app/api/social/connections/route.ts`**
   - `GET` — List user's connections with status filter (pending/accepted/declined/blocked), type filter (sent/received/all), pagination; includes direction field; includes profile + company for both requester and receiver
   - `POST` — Send connection request with receiverId and optional message; prevents self-connection, duplicate checks (409 with existing status), validates receiver exists and is active

5. **`/home/z/my-project/src/app/api/social/connections/[id]/route.ts`**
   - `PATCH` — Accept/decline connection (only receiver can act, must be pending)
   - `DELETE` — Remove connection (both parties can remove accepted connections; requester can cancel pending; receiver must use PATCH decline for pending)

6. **`/home/z/my-project/src/app/api/social/endorsements/route.ts`**
   - `GET` — Endorsements for a user (userId query param required), grouped by skill with count, endorsers list (profile+company), hasEndorsed flag, sorted by endorsement count desc; also returns currentUserEndorsedSkills
   - `POST` — Endorse a skill (toUserId + skill); prevents self-endorsement, duplicate check (409), skill max 100 chars

7. **`/home/z/my-project/src/app/api/social/discover/route.ts`**
   - `GET` — Discover users with search (name/jobTitle/bio/company), industry filter, skills filter, pagination; includes profile info, company (with logoUrl), connection status (none/pending/connected/declined) relative to current user, connection direction, connectionId, totalEndorsements, top 5 most-endorsed skills; sorted by endorsements desc then name

## Validation
- ESLint: passed with no errors
- Dev server: running normally
- All Prisma models already synced with database
