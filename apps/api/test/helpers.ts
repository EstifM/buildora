import type { Bot } from "grammy";
import { createApp } from "../src/app";
import { parseAllowedOrigins } from "../src/config";
import type { AiRunner } from "../src/ai/rewrite";
import type { AiRequestLog, NewPayment, PaymentAttempt, PaymentRecord, PaymentRepository } from "../src/payments/repository";
import { createBot } from "../src/telegram/bot";

export const ADMIN_ID = "111";
export const WEBHOOK_SECRET = "test-webhook-secret";
export const ORIGIN = "http://localhost:3000";
const DAY_MS = 24 * 60 * 60 * 1000;

// Same rules as the Postgres version: unique transaction IDs, decide only when pending.
export class MemoryRepository implements PaymentRepository {
  payments: PaymentRecord[] = [];
  attempts: PaymentAttempt[] = [];
  aiRequests: (AiRequestLog & { createdAt: Date })[] = [];
  leads = new Map<string, { firstSource: string; lastSource: string; timesSeen: number }>();

  async create(payment: NewPayment) {
    if (this.payments.some((p) => p.transactionId === payment.transactionId)) return "duplicate" as const;
    const record: PaymentRecord = {
      ...payment,
      id: crypto.randomUUID(),
      status: "pending",
      accessExpiresAt: null,
      createdAt: new Date(),
    };
    this.payments.push(record);
    return record;
  }
  async findById(id: string) {
    return this.payments.find((p) => p.id === id) ?? null;
  }
  async findByTokenHash(hash: string) {
    return this.payments.find((p) => p.accessTokenHash === hash) ?? null;
  }
  async listPending(limit: number) {
    return this.payments.filter((p) => p.status === "pending").slice(0, limit);
  }
  async decide(id: string, decision: "approved" | "rejected") {
    const payment = this.payments.find((p) => p.id === id && p.status === "pending");
    if (!payment) return null;
    payment.status = decision;
    payment.accessExpiresAt = decision === "approved" ? new Date(Date.now() + payment.durationDays * DAY_MS) : null;
    return payment;
  }
  async logAttempt(attempt: PaymentAttempt) {
    this.attempts.push(attempt);
  }
  async upsertLead(email: string, source: string) {
    const existing = this.leads.get(email);
    if (existing) this.leads.set(email, { ...existing, lastSource: source, timesSeen: existing.timesSeen + 1 });
    else this.leads.set(email, { firstSource: source, lastSource: source, timesSeen: 1 });
  }
  async logAiRequest(entry: AiRequestLog) {
    this.aiRequests.push({ ...entry, createdAt: new Date() });
  }
  async countAiRequestsSince(paymentId: string, since: Date) {
    return this.aiRequests.filter((r) => r.paymentId === paymentId && r.createdAt > since).length;
  }
}

export interface AiCall {
  model: string;
  input: Record<string, unknown>;
}

// A fake Workers AI binding. `reply` is what the model "returns".
export function fakeAi(calls: AiCall[], reply: unknown | (() => unknown)): AiRunner {
  return {
    async run(model, input) {
      calls.push({ model, input });
      return typeof reply === "function" ? (reply as () => unknown)() : reply;
    },
  };
}

export function chatReply(content: string, finishReason = "stop") {
  return {
    choices: [{ message: { role: "assistant", content }, finish_reason: finishReason }],
    usage: { prompt_tokens: 900, completion_tokens: 400 },
  };
}

export function fakeLimiter(allowed = Infinity): RateLimit {
  let count = 0;
  return { limit: async () => ({ success: ++count <= allowed }) };
}

export interface TelegramCall {
  method: string;
  payload: Record<string, unknown>;
}

// A bot whose API calls are recorded instead of sent to Telegram.
export function fakeBot(repo: PaymentRepository, calls: TelegramCall[], failSend = false): Bot {
  const bot = createBot({
    token: "123:TEST",
    adminChatId: ADMIN_ID,
    repo,
    botInfo: {
      id: 999,
      is_bot: true,
      first_name: "TestBot",
      username: "test_bot",
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
      can_manage_bots: false,
      supports_join_request_queries: false,
    },
  });
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    if (failSend && method === "sendMessage") throw new Error("Telegram is down");
    return { ok: true, result: true } as never;
  });
  return bot;
}

export function setup(
  options: { paymentLimit?: number; aiLimit?: number; leadLimit?: number; failSend?: boolean; aiReply?: unknown | (() => unknown) } = {},
) {
  const repo = new MemoryRepository();
  const calls: TelegramCall[] = [];
  const aiCalls: AiCall[] = [];
  const app = createApp({
    repo,
    bot: fakeBot(repo, calls, options.failSend),
    adminChatId: ADMIN_ID,
    webhookSecret: WEBHOOK_SECRET,
    ipHashSalt: "salt",
    allowedOrigins: parseAllowedOrigins(ORIGIN).rules,
    paymentLimiter: fakeLimiter(options.paymentLimit),
    statusLimiter: fakeLimiter(),
    leadLimiter: fakeLimiter(options.leadLimit),
    aiLimiter: fakeLimiter(options.aiLimit),
    ai: fakeAi(aiCalls, options.aiReply ?? chatReply("PROFESSIONAL SUMMARY\nAccountant.")),
  });
  return { app, repo, calls, aiCalls };
}

export function postPayment(app: ReturnType<typeof setup>["app"], body: unknown) {
  return app.request("/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.7" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function callbackUpdate(fromId: number, data: string) {
  return {
    update_id: Math.floor(Math.random() * 1e6),
    callback_query: {
      id: "cb-1",
      from: { id: fromId, is_bot: false, first_name: "User" },
      chat_instance: "ci",
      data,
      message: {
        message_id: 5,
        date: 0,
        chat: { id: fromId, type: "private", first_name: "User" },
        text: "old card",
      },
    },
  };
}

export function postWebhook(app: ReturnType<typeof setup>["app"], update: unknown, secret = WEBHOOK_SECRET) {
  return app.request("/telegram/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret },
    body: JSON.stringify(update),
  });
}
