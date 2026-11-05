import { Bot, InlineKeyboard, type Context } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import messages from "@resume-builder/shared/i18n/en.json";
import type { PaymentRecord, PaymentRepository } from "../payments/repository";

const text = messages.bot;
const PENDING_LIST_LIMIT = 10;
const CALLBACK_RE = /^pay:(approve|reject):([0-9a-f-]{36})$/;

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

// Times are shown to the admin in Ethiopian time.
export function formatEat(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  return `${formatted} (EAT)`;
}

function planName(payment: PaymentRecord): string {
  return payment.planId === "weekly" ? text.planWeekly : text.planDaily;
}

// Plain text (no Markdown/HTML parse mode), so user input can't inject formatting or links.
export function paymentCard(payment: PaymentRecord): string {
  return fill(text.newPayment, {
    planName: planName(payment),
    amount: payment.amountBirr,
    transactionId: payment.transactionId,
    email: payment.email,
    submittedAt: formatEat(payment.createdAt),
    paymentId: payment.id,
  });
}

function decisionKeyboard(paymentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(text.approveButton, `pay:approve:${paymentId}`)
    .text(text.rejectButton, `pay:reject:${paymentId}`);
}

export async function notifyAdmin(bot: Bot, adminChatId: string, payment: PaymentRecord): Promise<void> {
  await bot.api.sendMessage(adminChatId, paymentCard(payment), { reply_markup: decisionKeyboard(payment.id) });
}

interface BotOptions {
  token: string;
  adminChatId: string;
  repo: PaymentRepository;
  // Tests pass this to skip the getMe call.
  botInfo?: UserFromGetMe;
}

export function createBot({ token, adminChatId, repo, botInfo }: BotOptions): Bot {
  const bot = new Bot(token, botInfo ? { botInfo } : undefined);
  const isAdmin = (ctx: Context) => ctx.from !== undefined && String(ctx.from.id) === adminChatId;

  // Helps the admin find their chat ID during setup. Reveals nothing about payments.
  bot.command("start", (ctx) => ctx.reply(fill(text.start, { chatId: ctx.chat.id })));

  // Re-sends cards for payments still waiting, e.g. if a notification failed to arrive.
  bot.command("pending", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const pending = await repo.listPending(PENDING_LIST_LIMIT);
    for (const payment of pending) {
      await ctx.reply(paymentCard(payment), { reply_markup: decisionKeyboard(payment.id) });
    }
  });

  bot.callbackQuery(CALLBACK_RE, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: text.notAllowed, show_alert: true });
      return;
    }

    const [, action, paymentId] = ctx.match as RegExpMatchArray;
    const decision = action === "approve" ? "approved" : "rejected";
    const payment = await repo.decide(paymentId, decision, String(ctx.from.id));

    if (!payment) {
      const existing = await repo.findById(paymentId);
      await ctx.answerCallbackQuery({
        text: existing ? fill(text.alreadyDecided, { status: existing.status }) : text.notFound,
        show_alert: true,
      });
      return;
    }

    const note =
      payment.status === "approved" && payment.accessExpiresAt
        ? fill(text.approvedNote, { expiresAt: formatEat(payment.accessExpiresAt) })
        : text.rejectedNote;
    // Rebuild the card from the database (not the old message) and drop the buttons.
    await ctx.editMessageText(`${paymentCard(payment)}\n\n${note}`);
    await ctx.answerCallbackQuery({ text: payment.status === "approved" ? text.approvedToast : text.rejectedToast });
  });

  return bot;
}
