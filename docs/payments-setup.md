# Payments setup (Telebirr + Telegram manual approval)

How a payment works:

1. The user sends 50 ETB (1 day) or 200 ETB (7 days) with Telebirr to **+251921457288 (Estifanos)**.
2. In the payment popup they enter their email and the transaction number from the receipt.
3. The API (`apps/api`, a Cloudflare Worker) stores the payment as **pending** and the Telegram bot sends the admin a message with **Approve / Reject** buttons.
4. The admin checks the transaction in the Telebirr app, then taps a button.
5. The website checks the status every 3 seconds and shows "Payment confirmed" (access for 1 or 7 days, counted from approval) or "Payment not approved".

Every transaction number is stored forever (database `UNIQUE` constraint; deletes and edits are blocked by triggers), so it can never be used twice — even after a rejection.

## 1. Create the Telegram bot

1. In Telegram, open **@BotFather** → `/newbot` → follow the steps.
2. Copy the **bot token** (looks like `123456:ABC-...`). Treat it like a password.

## 2. Create the database (Neon)

1. Create a project at https://neon.tech.
2. Copy the connection string (`postgresql://...?sslmode=require`).
3. Open the Neon **SQL Editor** and run each file in [`apps/api/migrations/`](../apps/api/migrations/) in order
   (`0001_payments.sql`, `0002_ai_requests.sql`, `0003_leads.sql`, `0004_ai_request_kind.sql`). Each is safe to run more than once.
   Run new migrations **before** deploying the API version that needs them.

The `leads` table collects user emails (one row per email) from payments, download unlocks and AI Builder
attempts. See which emails came from where with:
`SELECT email, first_source, last_source, times_seen, created_at FROM leads ORDER BY created_at DESC;`

## 3. Find your Telegram chat ID (before connecting the webhook)

1. Open your bot in Telegram and send it any message (e.g. `/start`).
2. Run `curl "https://api.telegram.org/bot<BOT_TOKEN>/getUpdates"` and copy `message.from.id` (a number).
   (This only works while no webhook is set, so do it now.)

Only this Telegram account will be able to approve or reject payments.

## 4. Configure secrets

From `apps/api`:

```sh
npx wrangler secret put DATABASE_URL            # Neon connection string
npx wrangler secret put TELEGRAM_BOT_TOKEN      # from BotFather
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET # 16-256 chars of A-Z a-z 0-9 _ -, e.g.: openssl rand -hex 32
npx wrangler secret put IP_HASH_SALT            # at least 16 chars, e.g.: openssl rand -hex 32
npx wrangler secret put TELEGRAM_ADMIN_CHAT_ID  # the number from step 3
npx wrangler secret put CORS_ALLOWED_ORIGINS    # see below
```

`CORS_ALLOWED_ORIGINS` is the comma-separated list of website addresses allowed to call the API.
`*.` allows one subdomain level, which covers Cloudflare Pages preview deployments:

```
https://buildora.pro.et,https://resume-builder-ethiopia.pages.dev,https://*.resume-builder-ethiopia.pages.dev
```

The first entry is the public site address; the two `pages.dev` entries keep Cloudflare's own address and preview deployments working. Plain `http://` is only accepted
for localhost and home-network addresses (local development).

The Worker checks every setting when it starts and **refuses to serve** (HTTP 503, details only in the Worker logs)
if one is missing or malformed — for example a short webhook secret or an empty origin list.

## 5. Deploy the API

```sh
npm run deploy --workspace=apps/api
```

Note the Worker URL it prints (e.g. `https://resume-builder-api.<your-subdomain>.workers.dev`).

## 6. Connect the bot to the Worker (webhook)

```sh
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<WORKER_URL>/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
```

Telegram must reply `{"ok":true,...}`. Send `/start` to the bot to confirm it answers.

## 7. Point the website at the API

In the Cloudflare Pages project (Settings → Builds), set:

- **Build command:** `npm run build --workspace=apps/web` (this also writes the security headers file)
- **Build output directory:** `apps/web/out`
- **Environment variables** (public, not secrets):
  - `NEXT_PUBLIC_API_URL` = the Worker URL from step 5
  - `NEXT_PUBLIC_SITE_URL` = `https://buildora.pro.et` (the public address; never a `pages.dev` address,
    and never a per-deployment one like `https://f897bdec.….pages.dev`)

Pages builds fail on purpose if either URL is missing or not `https://`. Locally, copy `apps/web/.env.example`
to `apps/web/.env.local`.

## Daily use (admin)

- Each new payment arrives as a message with the plan, amount, transaction number and email.
- **Always check the transaction in your Telebirr app before tapping Approve.** The system cannot verify receipts by itself.
- Tapping a button updates the message and removes the buttons. Tapping again does nothing.
- `/pending` re-sends all payments still waiting (useful if a message was missed).

## Local development

1. `cp apps/api/.dev.vars.example apps/api/.dev.vars` and fill in real values (never commit `.dev.vars`).
2. `npm run dev:api` (API on http://localhost:8787) and `npm run dev:web` (site on http://localhost:3000).
3. Telegram can't reach `localhost`. To test the buttons locally, expose the API with a tunnel
   (e.g. `cloudflared tunnel --url http://localhost:8787`) and run the `setWebhook` command with the tunnel URL.
   Switch the webhook back to the production URL afterwards.

Tests: `npm test --workspace=apps/api` (in-memory database, fake Telegram and fake AI; real `.dev.vars` values are never loaded).

## Security notes

- Secrets live only in Cloudflare secrets / `.dev.vars`. The Telebirr number and account name are public on purpose.
- The webhook rejects any request without the correct `X-Telegram-Bot-Api-Secret-Token`.
- Paid access is tied to a random secret token stored in the paying browser (only its SHA-256 hash is stored
  in the database), not to the email alone — so typing someone else's email does not grant their access.
  Logging in from another device will come with email one-time codes (Resend phase).
- Rate limits: payment submissions 5/min per IP, status checks 30/min per token, email (lead) submissions
  10/min per IP, AI rewrites 5/min per token plus 20 per rolling 24 hours per paying user. Cloudflare rate
  limits are approximate and per location; the database `UNIQUE` constraint is the real guarantee against reuse.
- Every attempt (created, duplicate, invalid, rate-limited, notification failed) is logged in `payment_attempts`
  with a salted hash of the IP, never the raw IP.
- Payment records include the user's email and are kept permanently as financial/audit records. Mention this in
  the privacy policy.
