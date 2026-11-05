import { createApp } from "./app";
import { checkConfig, parseAllowedOrigins } from "./config";
import { NeonPaymentRepository } from "./payments/repository";
import { createBot } from "./telegram/bot";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    // Fail closed: never run with a missing/weak secret or an empty CORS list.
    const problems = checkConfig(env);
    if (problems.length > 0) {
      console.error("Refusing to serve: configuration problems", problems);
      return Response.json({ error: "server_error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    const repo = new NeonPaymentRepository(env.DATABASE_URL);
    const app = createApp({
      repo,
      bot: createBot({ token: env.TELEGRAM_BOT_TOKEN, adminChatId: env.TELEGRAM_ADMIN_CHAT_ID, repo }),
      adminChatId: env.TELEGRAM_ADMIN_CHAT_ID,
      webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
      ipHashSalt: env.IP_HASH_SALT,
      allowedOrigins: parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS).rules,
      paymentLimiter: env.PAYMENT_LIMITER,
      statusLimiter: env.STATUS_LIMITER,
      leadLimiter: env.LEAD_LIMITER,
      aiLimiter: env.AI_LIMITER,
      ai: { run: (model, input) => env.AI.run(model as keyof AiModels, input as never) },
    });
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
