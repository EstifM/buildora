"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  EMAIL_MAX_LENGTH,
  PAYMENT_DETAILS,
  PRICING_PLANS,
  TRANSACTION_ID_INPUT_MAX_LENGTH,
  TRANSACTION_ID_MAX_LENGTH,
  TRANSACTION_ID_MIN_LENGTH,
  isValidEmail,
  isValidTransactionId,
  type ApiErrorCode,
  type Locale,
  type PlanId,
} from "@resume-builder/shared";
import { recordLead } from "@/lib/api";
import { readUnlockedEmail } from "@/lib/browserStorage";
import { useLocale, useT } from "@/components/LocaleProvider";
import type { Translator } from "@/lib/i18n";
import { INTL_LOCALES } from "@/lib/locale";
import type { MessageKey } from "@/lib/i18n";
import type { PaidAccess } from "@/lib/usePaidAccess";

const PLAN_LABEL_KEYS: Record<PlanId, MessageKey> = {
  daily: "payment.planDaily",
  weekly: "payment.planWeekly",
};

function errorMessage(code: ApiErrorCode | "network", t: Translator): string {
  return t(`payment.errors.${code}`, { min: TRANSACTION_ID_MIN_LENGTH, max: TRANSACTION_ID_MAX_LENGTH });
}

export function formatAccessDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PaymentDialog({
  open,
  onClose,
  access,
  onStartAi,
}: {
  open: boolean;
  onClose: () => void;
  access: PaidAccess;
  onStartAi: () => void;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // The native <dialog> traps focus, closes on Esc and returns focus when closed.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="payment-title"
      className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/60"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 id="payment-title" className="text-lg font-bold text-slate-900">
          {t("payment.title")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("payment.close")}
          className="rounded-lg px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {open ? statusAnnouncement(access, t) : ""}
      </p>
      {open && <DialogBody access={access} onStartAi={onStartAi} />}
    </dialog>
  );
}

function statusAnnouncement(access: PaidAccess, t: Translator): string {
  if (access.status === "pending") return t("payment.waitingTitle");
  if (access.isActive) return t("payment.approvedTitle");
  if (access.status === "rejected") return t("payment.rejectedTitle");
  if (access.status === "expired") return t("payment.expiredTitle");
  return "";
}

function DialogBody({ access, onStartAi }: { access: PaidAccess; onStartAi: () => void }) {
  const t = useT();
  const locale = useLocale();
  if (access.status === "pending") {
    return (
      <StatusView title={t("payment.waitingTitle")} tone="waiting">
        <p>{t("payment.waitingBody")}</p>
        {access.transactionId && (
          <p className="mt-3 font-mono text-sm text-slate-500">
            {t("payment.waitingReference", { reference: access.transactionId })}
          </p>
        )}
      </StatusView>
    );
  }

  if (access.isActive && access.expiresAt) {
    return (
      <StatusView title={t("payment.approvedTitle")} tone="success">
        <p>{t("payment.approvedBody", { date: formatAccessDate(access.expiresAt, locale) })}</p>
        <button
          type="button"
          onClick={onStartAi}
          className="mt-5 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
        >
          {t("payment.startAi")}
        </button>
      </StatusView>
    );
  }

  if (access.status === "rejected" || access.status === "expired") {
    const rejected = access.status === "rejected";
    return (
      <StatusView title={t(rejected ? "payment.rejectedTitle" : "payment.expiredTitle")} tone="problem">
        <p>{t(rejected ? "payment.rejectedBody" : "payment.expiredBody")}</p>
        <button
          type="button"
          onClick={access.reset}
          className="mt-5 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
        >
          {t("payment.newPayment")}
        </button>
      </StatusView>
    );
  }

  return <PaymentForm access={access} />;
}

const TONE_STYLES = {
  waiting: { panel: "bg-amber-50 ring-amber-200", title: "text-slate-900", icon: "bg-amber-100 text-amber-700" },
  success: { panel: "bg-emerald-50 ring-emerald-200", title: "text-emerald-800", icon: "bg-emerald-600 text-white" },
  problem: { panel: "bg-red-50 ring-red-200", title: "text-red-800", icon: "bg-red-600 text-white" },
} as const;

function StatusView({
  title,
  tone,
  children,
}: {
  title: string;
  tone: keyof typeof TONE_STYLES;
  children: ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="p-5 sm:p-8">
      <div className={`rounded-2xl px-5 py-8 text-center text-slate-700 ring-1 sm:px-10 ${styles.panel}`}>
        <span
          aria-hidden="true"
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${styles.icon}`}
        >
          {tone === "waiting" ? (
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-amber-300 border-t-amber-700" />
          ) : tone === "success" ? (
            "✓"
          ) : (
            "✕"
          )}
        </span>
        <h3 className={`mt-4 text-xl font-bold ${styles.title}`}>{title}</h3>
        <div className="mx-auto mt-2 max-w-md">{children}</div>
      </div>
    </div>
  );
}

function PaymentForm({ access }: { access: PaidAccess }) {
  const t = useT();
  const [planId, setPlanId] = useState<PlanId>("daily");
  const [email, setEmail] = useState(() => readUnlockedEmail() ?? "");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedPlan = PRICING_PLANS.find((plan) => plan.id === planId) ?? PRICING_PLANS[0];

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(PAYMENT_DETAILS.telebirrNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the number is still visible to copy by hand.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!isValidEmail(email)) return setError(errorMessage("invalid_email", t));
    if (!isValidTransactionId(transactionId)) return setError(errorMessage("invalid_transaction_id", t));

    setError(null);
    setSubmitting(true);
    const failure = await access.submit({ email, planId, transactionId });
    setSubmitting(false);
    if (failure) setError(errorMessage(failure, t));
  }

  return (
    <div className="grid md:grid-cols-2">
      {/* Left: where and how much to pay */}
      <section className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6 md:border-b-0 md:border-r">
        <h3 className="font-semibold text-slate-900">{t("payment.detailsTitle")}</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">{t("payment.telebirrNumber")}</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-lg font-semibold tracking-wide text-slate-900">
                {PAYMENT_DETAILS.telebirrNumber}
              </span>
              <button
                type="button"
                onClick={copyNumber}
                className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:border-emerald-600 hover:text-emerald-700"
              >
                {copied ? t("payment.copied") : t("payment.copy")}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("payment.accountName")}</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{PAYMENT_DETAILS.accountName}</dd>
          </div>
        </dl>

        <fieldset disabled={submitting} className="mt-5">
          <legend className="text-sm font-medium text-slate-700">{t("payment.choosePlan")}</legend>
          <div className="mt-2 grid gap-2">
            {PRICING_PLANS.map((plan) => {
              const selected = plan.id === planId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setPlanId(plan.id)}
                  aria-pressed={selected}
                  className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed ${
                    selected
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {t(PLAN_LABEL_KEYS[plan.id], { price: plan.priceBirr })}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 rounded-xl bg-white p-4 text-center ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("payment.selectedAmount")}</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-600" aria-live="polite">
            {t("payment.amountValue", { price: selectedPlan.priceBirr })}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("payment.instructions")}</p>
      </section>

      {/* Right: confirm with the transaction number */}
      <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="p-5 sm:p-6">
        <h3 className="font-semibold text-slate-900">{t("payment.confirmTitle")}</h3>
        {/* Disabling the fieldset locks every field and the button while the request is sent. */}
        <fieldset disabled={submitting} className="disabled:opacity-80">

          <label htmlFor="payment-email" className="mt-4 block text-sm font-medium text-slate-700">
            {t("payment.emailLabel")}
          </label>
          <input
            id="payment-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={email}
            placeholder={t("payment.emailPlaceholder")}
            onChange={(event) => setEmail(event.target.value)}
          // Someone who opens the payment popup is trying the AI Builder; keep their email even if they don't pay.
          onBlur={() => {
            if (isValidEmail(email)) recordLead(email.trim().toLowerCase(), "ai_builder");
          }}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />

          <p className="mt-1 text-xs text-slate-500">{t("payment.emailNotice")}</p>

          <label htmlFor="payment-reference" className="mt-4 block text-sm font-medium text-slate-700">
            {t("payment.transactionLabel")}
          </label>
          <input
            id="payment-reference"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={TRANSACTION_ID_INPUT_MAX_LENGTH}
            value={transactionId}
            placeholder={t("payment.transactionPlaceholder")}
            aria-describedby="payment-reference-help"
            onChange={(event) => setTransactionId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <p id="payment-reference-help" className="mt-1 text-xs text-slate-500">
            {t("payment.transactionHelp")}
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-400 disabled:shadow-none"
          >
            {submitting ? t("payment.submitting") : t("payment.confirmButton")}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
