# Buildora – production checklist

Step-by-step setup details: [payments-setup.md](payments-setup.md) and [ai-builder.md](ai-builder.md).

## Manual steps

### Database (Neon)
- [ ] Run the migrations in order in the Neon SQL editor: `0001_payments.sql`, `0002_ai_requests.sql`, `0003_leads.sql`
      (all safe to re-run).
- [ ] Recommended: connect the API with a database role that has only `SELECT`, `INSERT`, `UPDATE` on these tables
      (no `DELETE`/`TRUNCATE`/DDL). Triggers already block deleting payments, but least privilege limits damage if
      `DATABASE_URL` ever leaks.

### API Worker secrets (`apps/api`)
- [ ] `npx wrangler secret put` each of: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
      (16–256 chars of `A-Z a-z 0-9 _ -`), `TELEGRAM_ADMIN_CHAT_ID` (numeric), `IP_HASH_SALT` (16+ chars),
      `CORS_ALLOWED_ORIGINS`.
- [ ] `CORS_ALLOWED_ORIGINS` = `https://resume-builder-ethiopia.pages.dev,https://*.resume-builder-ethiopia.pages.dev`
      (+ your custom domain later). This replaces the old `ALLOWED_ORIGINS` variable.
- [ ] Deploy: `npm run deploy --workspace=apps/api`.
- [ ] Check: `curl https://resume-builder-api.makler202.workers.dev/payments/status` returns **401**.
      A **503** means a setting is missing or malformed — the Worker logs name which one (never the value).

### Telegram
- [ ] Re-run `setWebhook` with `secret_token` if the webhook secret changed (see payments-setup.md, step 6),
      then confirm with `curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"` (correct URL, no errors).
- [ ] Turn on two-step verification for the admin Telegram account — it can approve payments.

### Website (Cloudflare Pages)
- [ ] Build command `npm run build --workspace=apps/web`, output directory `apps/web/out`.
- [ ] Environment variables: `NEXT_PUBLIC_API_URL` = the Worker URL;
      `NEXT_PUBLIC_SITE_URL` = the **stable** address (`https://resume-builder-ethiopia.pages.dev` or your domain).
      Your local `.env.local` currently points at a single deployment (`https://f897bdec…pages.dev`).
- [ ] After deploying, check the response headers of the home page include `Content-Security-Policy`,
      and that `/robots.txt` and `/sitemap.xml` show the stable address.

### Smoke test in production
- [ ] Free Build → unlock download → PDF and DOCX download.
- [ ] Payment popup → test transaction → Approve in Telegram → site updates by itself → AI build works.
- [ ] Reuse the same transaction number → "already used" error.
- [ ] Switch to አማርኛ and back.

### Before a public / paid launch
- [ ] Replace the ChatGPT / Claude / Gemini logos (trademarks; demo use only — see `public/brand/ai-styles/NOTICE.txt`).
- [ ] Replace `[support email]` in `apps/web/messages/legal/en.json` (`common.contactEmail`) with a real address —
      it appears in the Privacy Policy and Terms of Service. Have both pages reviewed by a lawyer.
- [ ] Add a support contact for rejected payments.
- [ ] Decide the AI budget: the Workers AI free tier covers ~100 rewrites/day for **all** users (each user is capped
      at 20/day). Move to the Workers Paid plan or lower the cap if usage grows.
- [ ] Commit the code to git. `.dev.vars`, `.env*` (except examples) and `out/` are ignored — check `git status`
      before the first commit.

## Security review summary

| Area | Status |
|---|---|
| Secrets | Only in Cloudflare secrets / `.dev.vars`. The website uses only public `NEXT_PUBLIC_*` URLs; no secret names or values appear in the web source or build output. Tests never load real `.dev.vars` values. |
| Config | The Worker refuses to serve (fail closed) if any setting is missing or weak, e.g. an empty webhook secret. |
| Transaction IDs | Normalized (uppercase, spaces/dashes removed, only `A-Z 0-9`, 6–32 chars) and protected by a database `UNIQUE` constraint. Triggers block deleting payments or changing a transaction ID. Rejected IDs stay blocked forever. |
| Rate limits | Payments 5/min per IP · status 30/min per token · leads 10/min per IP · AI 5/min per token + 20/day per paying user. The webhook is protected by its secret instead. |
| CORS | Only origins in `CORS_ALLOWED_ORIGINS` (validated; `https` only except local dev; wildcards one level only). CORS limits browsers only — every endpoint is also protected by validation, tokens and rate limits. |
| Errors | Users only ever get short error codes (`server_error`, `ai_unavailable`, …). Database, Telegram and AI errors are logged on the server only. |
| AI style | Accepted only if it is exactly `natural`, `structured` or `concise`; the server maps it to fixed prompt text. Anything else → 400 before the model is called. |
| Browser headers | `out/_headers`: Content-Security-Policy (network access only to the site and the API), no framing, nosniff, HSTS, strict referrer, permissions policy. The API sends standard secure headers and `Cache-Control: no-store`. |
| File retention | Still documented: uploaded files and generated resumes must be deleted within 3 hours once they are stored on R2 (`FILE_RETENTION_HOURS` in `packages/shared/src/storage.ts`, referenced in the upload and download code). Today nothing is stored server-side: files stay in the browser. |

## Remaining risks (accepted for now)

1. **Manual payment checks.** Anyone can type a made-up transaction number; the admin must verify each one in Telebirr.
2. **No email verification yet.** Emails aren't proven (one-time codes come with Resend). Paid access is tied to a
   secret token in the paying browser, so it doesn't move to other devices.
3. **Client-side gates.** The download email gate and the protected preview are deterrents only; the full resume
   text is in the browser.
4. **Token in localStorage.** A cross-site-scripting bug would expose it. React escaping and the CSP reduce this;
   the CSP still needs `'unsafe-inline'` for scripts because of Next.js static export.
5. **Approximate rate limits.** Cloudflare limits are per location and IP-based for anonymous endpoints (shared mobile IPs).
6. **AI limits.** Prompt-injection and invented content can be reduced, not eliminated; users are asked to review results.
7. **Dependency advisory:** npm reports a high-severity issue in `braces`, but only inside the ESLint dev tooling — it is not part of the website or the Worker.
