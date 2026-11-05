"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeTransactionId, type ApiErrorCode, type PaymentStatus, type PlanId } from "@resume-builder/shared";
import { createPayment, getPaymentStatus } from "@/lib/api";
import { readStoredPayment, storePayment, storeUnlockedEmail, type StoredPayment } from "@/lib/browserStorage";

const POLL_INTERVAL_MS = 3000;

export interface PaidAccess {
  status: PaymentStatus | "none";
  planId: PlanId | null;
  transactionId: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  // Secret token of the paying browser; sent with AI Builder requests.
  accessToken: string | null;
  submit: (input: { email: string; planId: PlanId; transactionId: string }) => Promise<ApiErrorCode | "network" | null>;
  // Forget the stored payment (after a rejection or expiry) so the user can pay again.
  reset: () => void;
  // Re-check the status now (e.g. after the API said access is no longer active).
  refresh: () => void;
}

interface State {
  payment: StoredPayment | null;
  status: PaymentStatus | "none";
  expiresAt: Date | null;
}

const EMPTY: State = { payment: null, status: "none", expiresAt: null };

export function usePaidAccess(): PaidAccess {
  const [state, setState] = useState<State>(EMPTY);

  // Applies a status response; called from async callbacks only.
  const applyStatus = useCallback((payment: StoredPayment, result: Awaited<ReturnType<typeof getPaymentStatus>>) => {
    if (result.ok) {
      const { status, accessExpiresAt } = result.data;
      setState({ payment, status, expiresAt: accessExpiresAt ? new Date(accessExpiresAt) : null });
    } else if (result.error === "unauthorized" || result.error === "not_found") {
      storePayment(null);
      setState(EMPTY);
    }
    // Network errors and rate limits: keep the current state and try again on the next poll.
  }, []);

  // Restore a payment made earlier in this browser.
  useEffect(() => {
    const stored = readStoredPayment();
    if (!stored) return;
    let cancelled = false;
    getPaymentStatus(stored.accessToken).then((result) => {
      if (!cancelled) applyStatus(stored, result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyStatus]);

  // While waiting for the admin, check every few seconds. Phones pause timers while the
  // user is in another app (Telebirr, Telegram), so also check as soon as they come back.
  useEffect(() => {
    if (state.status !== "pending" || !state.payment) return;
    const payment = state.payment;
    let cancelled = false;
    const check = async () => {
      const result = await getPaymentStatus(payment.accessToken);
      if (!cancelled) applyStatus(payment, result);
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const timer = setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("focus", checkWhenVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("focus", checkWhenVisible);
    };
  }, [state.status, state.payment, applyStatus]);

  // When access runs out while the page is open, switch to "expired" right away.
  useEffect(() => {
    if (state.status !== "approved" || !state.expiresAt) return;
    const msLeft = state.expiresAt.getTime() - Date.now();
    // setTimeout can't wait longer than ~24 days; plans are at most 7 days.
    const timer = setTimeout(() => setState((current) => ({ ...current, status: "expired" })), Math.max(msLeft, 0));
    return () => clearTimeout(timer);
  }, [state.status, state.expiresAt]);

  const submit: PaidAccess["submit"] = useCallback(async ({ email, planId, transactionId }) => {
    const result = await createPayment({ email, planId, transactionId });
    if (!result.ok) return result.error;
    const payment = { accessToken: result.data.accessToken, planId, transactionId: normalizeTransactionId(transactionId) };
    storePayment(payment);
    storeUnlockedEmail(email.trim().toLowerCase());
    setState({ payment, status: "pending", expiresAt: null });
    return null;
  }, []);

  const refresh = useCallback(() => {
    const payment = state.payment;
    if (!payment) return;
    void getPaymentStatus(payment.accessToken).then((result) => applyStatus(payment, result));
  }, [state.payment, applyStatus]);

  const reset = useCallback(() => {
    storePayment(null);
    setState(EMPTY);
  }, []);

  const isActive = state.status === "approved" && state.expiresAt !== null && state.expiresAt > new Date();

  return {
    status: state.status,
    planId: state.payment?.planId ?? null,
    transactionId: state.payment?.transactionId ?? null,
    expiresAt: state.expiresAt,
    isActive,
    accessToken: state.payment?.accessToken ?? null,
    submit,
    reset,
    refresh,
  };
}
