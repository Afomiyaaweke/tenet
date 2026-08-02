# TenetBid — Deployment Guide

## Quick Start

### 1. Install dependencies
```bash
bun install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in the required values:
- `JWT_SECRET` — **Required**. Generate with: `openssl rand -base64 48`
- `DATABASE_URL` — SQLite path or PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` — Your app's public URL (e.g. `https://yourdomain.com`)

### 3. Set up the database
```bash
bun run db:push
```

### 4. Build for production
```bash
bun run build
```

### 5. Start the server
```bash
bun run start
```

The app will be available at `http://localhost:3000`.

---

## What's Included

- **Landing Page** — Marketing homepage with features, pricing, testimonials
- **Authentication** — Sign up, sign in, forgot/reset password
- **Dashboard** — Full procurement management dashboard
- **Tender Management** — Create, discover, and manage tenders
- **AI Document Studio** — AI-powered document generation
- **Bid Management** — Create and track bids
- **Applicant Analyzer** — AI-powered applicant analysis
- **Project Management** — Track projects, milestones, and tasks
- **Social Circle** — Connect with other professionals
- **Company Profiles** — Company verification and management
- **Pricing Plans** — Free, Pro, and Enterprise tiers

---

## Deployment on Vercel (Recommended)

1. Push this code to a GitHub repository
2. Connect the repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy — Vercel will run `bun run build` automatically

---

## Deployment on VPS / Dedicated Server

1. Upload the zip to your server
2. Unzip and install dependencies
3. Set up `.env` with production values
4. Use PM2 or systemd to manage the process:
```bash
bun run start
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ Yes | Signing secret (min 32 chars) |
| `DATABASE_URL` | ✅ Yes | Database connection string |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your app's public URL |
| `RESEND_API_KEY` | Optional | Email service (resend.com) |
| `SMTP_HOST/PORT/USER/PASS` | Optional | SMTP fallback for emails |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob storage |
| `APIFY_API_TOKEN` | Optional | External tender scraping |
| `NEXT_PUBLIC_CLARITY_ID` | Optional | Microsoft Clarity analytics |

---

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript 5**
- **Tailwind CSS 4** + shadcn/ui
- **Prisma ORM** (SQLite / PostgreSQL)
- **Bun** runtime
