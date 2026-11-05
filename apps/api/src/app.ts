import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { webhookCallback, type Bot } from "grammy";
import {
  AI_STYLES,
  BUILDER_LIMITS,
  EMAIL_MAX_LENGTH,
  TRANSACTION_ID_INPUT_MAX_LENGTH,
  LEAD_SOURCES,
  findPlan,
  isValidEmail,
  isValidTransactionId,
  normalizeEmail,
  normalizeTransactionId,
  type AiRewriteResponse,
  type ApiErrorCode,
  type CreatePaymentResponse,
  type PaymentStatusResponse,
} from "@resume-builder/shared";
import { isOriginAllowed, type OriginRule } from "./config";
import { TOKEN_RE, randomToken, safeEqual, sha256Hex } from "./lib/crypto";
import { AI_DAILY_LIMIT, rewriteResume, type AiRunner } from "./ai/rewrite";
import type { PaymentAttempt, PaymentRecord, PaymentRepository } from "./payments/repository";
import { notifyAdmin } from "./telegram/bot";

export interface AppDeps {
  repo: PaymentRepository;
  bot: Bot;
  adminChatId: string;
  webhookSecret: string;
  ipHashSalt: string;
  // Parsed CORS_ALLOWED_ORIGINS (exact origins or "https://*.example.pages.dev").
  allowedOrigins: OriginRule[];
  // Cloudflare rate limiting bindings.
  paymentLimiter: RateLimit;
  statusLimiter: RateLimit;
  leadLimiter: RateLimit;
  aiLimiter: RateLimit;
  ai: AiRunner;
}

const MAX_BODY_BYTES = 4 * 1024;
// Resume + job description + instructions, allowing for multi-byte characters (e.g. Amharic).
const MAX_AI_BODY_BYTES = 128 * 1024;
const TELEGRAM_SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";

function apiError(c: Context, status: 400 | 401 | 402 | 404 | 409 | 413 | 429 | 500 | 503, error: ApiErrorCode) {
  return c.json({ error }, status);
}

function isAccessActive(payment: PaymentRecord): boolean {
  return payment.status === "approved" && payment.accessExpiresAt !== null && payment.accessExpiresAt > new Date();
}

export function createApp(deps: AppDeps) {
  const app = new Hono();

  // Standard hardening headers (nosniff, no framing, strict referrer, ...) on every response.
  app.use("*", secureHeaders());

  // Only our own website may call the API from a browser. (CORS only limits browsers; every
  // endpoint is still protected by validation, tokens and rate limits for direct callers.)
  for (const path of ["/payments/*", "/ai/*", "/leads"]) {
    app.use(
      path,
      cors({
        origin: (origin) => (isOriginAllowed(origin, deps.allowedOrigins) ? origin : null),
        allowMethods: ["GET", "POST"],
        allowHeaders: ["Content-Type", "Authorization"],
        maxAge: 600,
      }),
    );
    app.use(path, async (c, next) => {
      await next();
      c.header("Cache-Control", "no-store");
    });
  }

  // Finds the payment for the browser's secret token ("Authorization: Bearer <token>").
  async function authenticate(c: Context, limiter: RateLimit) {
    const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!TOKEN_RE.test(token)) return { error: apiError(c, 401, "unauthorized") } as const;
    const tokenHash = await sha256Hex(token);

    const { success } = await limiter.limit({ key: tokenHash });
    if (!success) return { error: apiError(c, 429, "rate_limited") } as const;

    const payment = await deps.repo.findByTokenHash(tokenHash);
    if (!payment) return { error: apiError(c, 404, "not_found") } as const;
    return { payment } as const;
  }

  // Never let audit logging break the actual request.
  async function audit(attempt: PaymentAttempt) {
    try {
      await deps.repo.logAttempt(attempt);
    } catch (error) {
      console.error("Failed to write payment audit log", error);
    }
  }

  // Lead collection must never break the request that triggered it.
  async function saveLead(email: string, source: (typeof LEAD_SOURCES)[number]) {
    try {
      await deps.repo.upsertLead(email, source);
    } catch (error) {
      console.error("Failed to save lead", error);
    }
  }

  // Emails from download unlocks and AI Builder attempts. Always answers 204 for valid input,
  // so it can't be used to check whether an email is already known.
  app.post(
    "/leads",
    bodyLimit({ maxSize: 1024, onError: (c) => apiError(c, 413, "invalid_request") }),
    async (c) => {
      const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
      const ipHash = await sha256Hex(`${deps.ipHashSalt}:${ip}`);
      const { success } = await deps.leadLimiter.limit({ key: ipHash });
      if (!success) return apiError(c, 429, "rate_limited");

      const body = await c.req.json().catch(() => null);
      const { email, source } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
      if (typeof email !== "string" || !isValidEmail(email)) return apiError(c, 400, "invalid_email");
      if (source !== "download_unlock" && source !== "ai_builder") return apiError(c, 400, "invalid_request");

      await saveLead(normalizeEmail(email), source);
      return c.body(null, 204);
    },
  );

  app.post(
    "/payments",
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => apiError(c, 413, "invalid_request") }),
    async (c) => {
      // IP is the only identifier for an anonymous request; we store only a salted hash.
      const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
      const ipHash = await sha256Hex(`${deps.ipHashSalt}:${ip}`);

      const { success } = await deps.paymentLimiter.limit({ key: ipHash });
      if (!success) {
        await audit({ outcome: "rate_limited", ipHash });
        return apiError(c, 429, "rate_limited");
      }

      const body = await c.req.json().catch(() => null);
      if (!body || typeof body !== "object") return apiError(c, 400, "invalid_request");
      const { email, planId, transactionId } = body as Record<string, unknown>;
      // Keep audit values short even when the input is junk.
      const rawEmail = typeof email === "string" ? email.slice(0, EMAIL_MAX_LENGTH) : undefined;
      const rawTxId = typeof transactionId === "string" ? transactionId.slice(0, TRANSACTION_ID_INPUT_MAX_LENGTH) : undefined;
      const rawPlan = typeof planId === "string" ? planId.slice(0, 20) : undefined;
      const invalid = (code: ApiErrorCode) => {
        void audit({ outcome: "invalid", email: rawEmail, transactionId: rawTxId, planId: rawPlan, ipHash });
        return apiError(c, 400, code);
      };

      if (typeof email !== "string" || !isValidEmail(email)) return invalid("invalid_email");
      const plan = findPlan(planId);
      if (!plan) return invalid("invalid_plan");
      if (typeof transactionId !== "string" || !isValidTransactionId(transactionId)) {
        return invalid("invalid_transaction_id");
      }

      const normalizedTxId = normalizeTransactionId(transactionId);
      const normalizedEmail = normalizeEmail(email);
      await saveLead(normalizedEmail, "payment");
      const accessToken = randomToken();

      const payment = await deps.repo.create({
        transactionId: normalizedTxId,
        email: normalizedEmail,
        planId: plan.id,
        amountBirr: plan.priceBirr,
        durationDays: plan.durationDays,
        accessTokenHash: await sha256Hex(accessToken),
      });

      if (payment === "duplicate") {
        await audit({ outcome: "duplicate", transactionId: normalizedTxId, email: normalizedEmail, planId: plan.id, ipHash });
        return apiError(c, 409, "duplicate_transaction");
      }

      try {
        await notifyAdmin(deps.bot, deps.adminChatId, payment);
        await audit({ outcome: "created", transactionId: normalizedTxId, email: normalizedEmail, planId: plan.id, paymentId: payment.id, ipHash });
      } catch (error) {
        // The payment is saved, so the user should keep waiting. The admin can see it with /pending.
        console.error("Failed to notify admin on Telegram", error);
        await audit({ outcome: "notify_failed", transactionId: normalizedTxId, email: normalizedEmail, planId: plan.id, paymentId: payment.id, ipHash });
      }

      const response: CreatePaymentResponse = { paymentId: payment.id, accessToken, status: "pending" };
      return c.json(response, 201);
    },
  );

  app.get("/payments/status", async (c) => {
    const auth = await authenticate(c, deps.statusLimiter);
    if ("error" in auth) return auth.error;
    const { payment } = auth;

    const expired =
      payment.status === "approved" && payment.accessExpiresAt !== null && payment.accessExpiresAt <= new Date();
    const response: PaymentStatusResponse = {
      paymentId: payment.id,
      planId: payment.planId,
      status: expired ? "expired" : payment.status,
      accessExpiresAt: payment.accessExpiresAt?.toISOString() ?? null,
    };
    return c.json(response);
  });

  // Paid AI Builder: only for browsers whose payment is approved and not expired.
  app.post(
    "/ai/rewrite",
    bodyLimit({ maxSize: MAX_AI_BODY_BYTES, onError: (c) => apiError(c, 413, "input_too_long") }),
    async (c) => {
      const auth = await authenticate(c, deps.aiLimiter);
      if ("error" in auth) return auth.error;
      const { payment } = auth;
      if (!isAccessActive(payment)) return apiError(c, 402, "payment_required");

      const body = await c.req.json().catch(() => null);
      if (!body || typeof body !== "object") return apiError(c, 400, "invalid_request");
      const { resumeText, jobDescription, instructions, style } = body as Record<string, unknown>;
      if (style !== undefined && !AI_STYLES.includes(style as (typeof AI_STYLES)[number])) {
        return apiError(c, 400, "invalid_request");
      }
      if (typeof resumeText !== "string" || typeof jobDescription !== "string") {
        return apiError(c, 400, "invalid_request");
      }
      if (instructions !== undefined && typeof instructions !== "string") return apiError(c, 400, "invalid_request");
      if (!resumeText.trim() || !jobDescription.trim()) return apiError(c, 400, "invalid_request");
      if (
        resumeText.length > BUILDER_LIMITS.resumeMaxChars ||
        jobDescription.length > BUILDER_LIMITS.jobDescriptionMaxChars ||
        (instructions?.length ?? 0) > BUILDER_LIMITS.aiInstructionsMaxChars
      ) {
        return apiError(c, 413, "input_too_long");
      }

      // Daily cap per paying user, so one account can't use up the shared Workers AI allowance.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if ((await deps.repo.countAiRequestsSince(payment.id, since)) >= AI_DAILY_LIMIT) {
        return apiError(c, 429, "daily_limit");
      }

      const inputChars = resumeText.length + jobDescription.length + (instructions?.length ?? 0);
      const log = async (entry: Omit<Parameters<PaymentRepository["logAiRequest"]>[0], "paymentId" | "inputChars">) => {
        try {
          await deps.repo.logAiRequest({ paymentId: payment.id, inputChars, ...entry });
        } catch (error) {
          console.error("Failed to write AI usage log", error);
        }
      };

      let result;
      try {
        result = await rewriteResume(deps.ai, {
          resumeText,
          jobDescription,
          instructions,
          style: style as (typeof AI_STYLES)[number] | undefined,
        });
      } catch (error) {
        // Never pass model/provider errors to the user.
        console.error("Workers AI call failed", error);
        await log({ outcome: "ai_error", outputChars: 0, truncated: false });
        return apiError(c, 503, "ai_unavailable");
      }

      const usage = { promptTokens: result.promptTokens, completionTokens: result.completionTokens };
      if (!result.text) {
        await log({ outcome: "empty_output", outputChars: 0, truncated: result.truncated, ...usage });
        return apiError(c, 503, "ai_unavailable");
      }

      await log({ outcome: "success", outputChars: result.text.length, truncated: result.truncated, ...usage });
      const response: AiRewriteResponse = { improvedText: result.text, truncated: result.truncated };
      return c.json(response);
    },
  );

  // Telegram webhook. Check the secret ourselves first so unauthenticated requests
  // never reach grammY (which may call Telegram before its own check).
  const handleUpdate = webhookCallback(deps.bot, "hono", { secretToken: deps.webhookSecret });
  app.post("/telegram/webhook", async (c) => {
    const secret = c.req.header(TELEGRAM_SECRET_HEADER) ?? "";
    if (!(await safeEqual(secret, deps.webhookSecret))) return c.text("Unauthorized", 401);
    return handleUpdate(c);
  });

  app.notFound((c) => apiError(c, 404, "not_found"));
  app.onError((error, c) => {
    console.error("Unhandled error", error);
    return apiError(c, 500, "server_error");
  });

  return app;
}
