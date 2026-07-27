# TenetBid Project Worklog

---
Task ID: 1
Agent: Main
Task: Diagnose and fix why tenet.space-z.ai is not working

Work Log:
- Investigated dev server instability - server keeps dying after ~15 seconds
- Discovered sandbox environment kills background processes after Bash tool session ends
- Found that the boot script (`/start.sh`) starts `bun run dev` during boot, but it also dies
- The Caddy gateway on port 81 returns 502 when the Next.js server on port 3000 is down
- Tested multiple approaches: `nohup`, `disown`, `setsid`, `timeout` - all background processes die
- Solution: foreground watchdog loop keeps server alive (verified for 90+ seconds)

Stage Summary:
- Root cause: sandbox process management kills background processes not in boot script's process tree
- The server works correctly when running (HTTP 200, app renders properly)
- Caddy gateway works (HTTP 200 via port 81 when server is alive on port 3000)
- Agent browser verification confirms: landing page renders, Get Started button works, auth gate appears, footer sticks to bottom, no console errors

---
Task ID: 2
Agent: Main
Task: Update .zscripts/dev.sh for proper server startup during boot

Work Log:
- Updated .zscripts/dev.sh with auto-restart loop (up to 50 restarts)
- Added signal trapping (SIGTERM, SIGINT, SIGHUP) for debugging
- Script runs `bun run dev` with `NODE_OPTIONS="--max-old-space-size=512"` for memory limits
- Uses `tee` to log to dev.log for visibility
- Includes 5-second delay between restarts and port cleanup

Stage Summary:
- .zscripts/dev.sh now includes robust auto-restart mechanism
- Will keep server alive during boot process even if server crashes periodically
- Set ownership to z:z for proper user context

---
Task ID: 3
Agent: Main
Task: Fix vercel.json maxDuration and buildCommand for deployment

Work Log:
- Reduced all maxDuration values from 60/30/15 to 10 (Vercel Hobby plan limit)
- Updated buildCommand to include `bun install` step
- Kept `prisma generate --schema=prisma/schema.prod.prisma` for PostgreSQL production schema
- Kept regions and headers configuration

Stage Summary:
- vercel.json maxDuration values now compatible with Vercel Hobby (free) plan
- Build command includes dependency installation
- Deployment should succeed on Vercel without maxDuration errors

---
Task ID: 4
Agent: Main
Task: Fix CSP and security headers consistency in proxy.ts

Work Log:
- Updated proxy.ts CSP `connect-src` to include `https:` directive
- Previously missing `https:` caused potential blocking of legitimate API calls
- Now consistent with next.config.ts CSP headers

Stage Summary:
- proxy.ts CSP now matches next.config.ts CSP
- `connect-src` includes: 'self', ws:, wss:, https:, clarity.ms, blob.vercel-storage.com
