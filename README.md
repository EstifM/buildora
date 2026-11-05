# Buildora

Buildora tailors your resume to a job description so it gets past applicant tracking systems (ATS), with a free keyword builder and a paid AI rewrite for Ethiopian job seekers.

## Features

- Free ATS keyword check with a before/after match score
- Paid AI rewrite (Cloudflare Workers AI) with three writing styles
- Protected, watermarked preview and PDF/Word downloads after email unlock
- Telebirr payments approved by the admin through a Telegram bot
- English and Amharic (አማርኛ) interface, SEO-ready static site

## Tech stack

- **Web:** Next.js (App Router, static export), React, Tailwind CSS, TypeScript — Cloudflare Pages
- **API:** Cloudflare Workers, Hono, grammY (Telegram), Workers AI
- **Database:** Neon (Postgres)
- **Monorepo:** npm workspaces — `apps/web`, `apps/api`, `packages/shared`

## Run locally

```sh
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars   # fill in your own values
npm run dev:api   # API on http://localhost:8787
npm run dev:web   # site on http://localhost:3000
npm test
```

Setup and deployment: [docs/production-checklist.md](docs/production-checklist.md).
