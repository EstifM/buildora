# Resume Builder Ethiopia – Project Constitution

## Project Goal
Build a simple, fast, and secure web app that:
- Lets users upload/paste a resume + job description
- Improves the resume for ATS using a free deterministic algorithm
- Offers a higher-quality AI rewrite (paid)
- Shows clear before/after preview with improvement score
- Requires email signup to download
- Uses Telebirr + Telegram bot for payment activation (50 birr/day or 200 birr/week)
- Runs on Cloudflare (Workers + Pages + R2) + Neon + Resend

## Non-Negotiable Rules (must be followed by every agent)

### 1. Design & UX
- Keep the UI extremely simple, clean, and interactive
- Mobile-first
- Clear visual hierarchy
- Big glowing improvement score after building
- Collapsible / modal before-after preview
- No clutter, no unnecessary animations

### 2. Content & Internationalization
- ALL user-facing text (labels, buttons, errors, instructions, pricing, success messages) MUST live in JSON files under `packages/shared/i18n/` or `apps/web/messages/`
- Never hard-code strings in components
- Design so adding Amharic (or other languages) later is easy
- Use a simple key structure: `common.save`, `builder.uploadResume`, `payment.dailyPlan`, etc.

### 3. Security (Critical)
- Transaction IDs must be unique and stored permanently. Re-using a Transaction ID must return a clear error.
- Never store plain passwords. Prefer magic-link or simple email + one-time code.
- Validate and sanitize all user inputs (resume text, JD, transaction IDs, emails)
- No secrets in code or client-side. Use environment variables / Cloudflare secrets only.
- Rate-limit sensitive endpoints (build, payment verification, activation)
- Activate accounts only after successful one-time code verification
- Log every payment attempt for audit

### 4. Architecture Decisions
- Frontend: Next.js (App Router) + Tailwind + TypeScript → deploy to Cloudflare Pages
- Backend: Cloudflare Workers (prefer Hono or Python Workers if needed)
- Database: Neon (Postgres)
- Files: Cloudflare R2
- Email: Resend
- Telegram Bot: Cloudflare Worker (webhook mode) using grammY or Telegraf
- Free tier = deterministic keyword algorithm only
- Paid tier = Cloudflare Workers AI (or Groq/OpenRouter fallback) for full rewrite + cover letter

### 5. Development Style
- Prefer simple, readable code over clever code
- Write clear comments only when necessary
- Every new feature must include basic error handling
- Prefer server actions / API routes that are easy to test
- Always create or update types in `packages/shared`

### 6. What agents must do before finishing any task
1. Show a short plan first (unless told otherwise)
2. Follow the security rules above
3. Put all new user-facing text into the i18n JSON files
4. Make the UI simple and interactive
5. List any potential security risks they introduced and how they mitigated them

## Current Phase
We are starting from zero. Follow the phase skills strictly.
## Git Commits
- Do not add a "Co-Authored-By" line to commit messages.
