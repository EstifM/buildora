# AI Builder (paid)

The AI Builder rewrites a resume for a job description using Cloudflare Workers AI.

- Model: `@cf/qwen/qwen3-30b-a3b-fp8` (set in [`apps/api/src/ai/rewrite.ts`](../apps/api/src/ai/rewrite.ts))
- `max_tokens: 1500`, `temperature: 0.3`, thinking turned off with Qwen3's `/no_think` switch
- Endpoint: `POST /ai/rewrite` on the API Worker, only for browsers with an approved, unexpired payment
- Cover letter: `POST /ai/cover-letter` (same access rules; prompt in [`apps/api/src/ai/coverLetter.ts`](../apps/api/src/ai/coverLetter.ts),
  700 output tokens). It is offered after the resume is built and is written from the finished resume. Rewrites and
  cover letters share the rate limit and the daily cap; `ai_requests.kind` records which one each request was
  (migration `0004_ai_request_kind.sql`).
  (same secret token as the payment status check)
- Rate limit: 5 rewrites per minute per paying user (`AI_LIMITER`)

## Setup

1. Run [`apps/api/migrations/0002_ai_requests.sql`](../apps/api/migrations/0002_ai_requests.sql) in the Neon SQL editor
   (after `0001_payments.sql`).
2. The `AI` binding is already in `apps/api/wrangler.jsonc`. Deploy as usual: `npm run deploy --workspace=apps/api`.

Workers AI needs no API key inside a Worker; it uses your Cloudflare account. Note that `wrangler dev`
also calls Workers AI on your account (it always runs remotely), so local testing uses real neurons.

## Quick live check of the model (optional)

Uses your account and a few neurons. Create an API token with the "Workers AI" permission, then:

```sh
curl "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/run/@cf/qwen/qwen3-30b-a3b-fp8" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -d '{"messages":[{"role":"user","content":"Rewrite as one strong resume bullet: responsible for payroll for 120 staff /no_think"}],"max_tokens":200}'
```

You should get a `choices[0].message.content` with a short bullet and little or no reasoning text.

## Cost and limits

Based on Cloudflare's published pricing for this model ($0.0509 / M input tokens, $0.335 / M output tokens),
one full rewrite costs roughly 80–90 neurons. The free allowance (10,000 neurons/day per account) covers about
100 rewrites per day across all users. On the Workers Free plan, calls fail after the daily allowance; users then
see "The AI Builder is busy right now", and Free Build keeps working. Check usage with:

```sql
SELECT date_trunc('day', created_at) AS day, count(*) AS rewrites,
       sum(prompt_tokens) AS input_tokens, sum(completion_tokens) AS output_tokens
FROM ai_requests GROUP BY 1 ORDER BY 1 DESC;
```

## Honesty and safety

- The system prompt forbids inventing employers, titles, dates, numbers, degrees, certifications, tools or skills,
  and limits the output to plain text under 700 words.
- The resume, job description and extra instructions are sent as clearly marked data blocks; users can't close
  those blocks early, and extra instructions may only change emphasis, tone and ordering.
- The output is cleaned (reasoning, Markdown and chatty intro/outro lines removed) and shown as plain text in the
  watermarked, copy-protected preview. The UI reminds users to review the result.
- Model or provider errors are never shown to users. `ai_requests` stores only sizes, token counts and outcome —
  never resume text.
- A prompt can't fully guarantee the model won't add something untrue. Users must review the result; consider
  adding a "report a problem" link later.
