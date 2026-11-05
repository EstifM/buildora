import type { PlanId } from "@resume-builder/shared";

// Small wrappers around browser storage. Storage can be blocked (private mode),
// so every call is wrapped and failures are ignored.

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Ignore: the value then only lasts until the page reloads.
  }
}

const session = () => window.sessionStorage;
const local = () => window.localStorage;

// Email used to unlock downloads. Session only: forgotten when the tab closes.
const UNLOCKED_EMAIL_KEY = "resume-builder:unlocked-email";

export const readUnlockedEmail = () => read(session, UNLOCKED_EMAIL_KEY);
export const storeUnlockedEmail = (email: string | null) => write(session, UNLOCKED_EMAIL_KEY, email);

// The paying browser's secret token. Kept in localStorage so paid access survives
// closing the tab; it only works for checking this payment's status.
const PAYMENT_KEY = "resume-builder:payment";

export interface StoredPayment {
  accessToken: string;
  planId: PlanId;
  transactionId: string;
}

export function readStoredPayment(): StoredPayment | null {
  const raw = read(local, PAYMENT_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredPayment>;
    return typeof value.accessToken === "string" && typeof value.planId === "string" && typeof value.transactionId === "string"
      ? (value as StoredPayment)
      : null;
  } catch {
    return null;
  }
}

export const storePayment = (payment: StoredPayment | null) =>
  write(local, PAYMENT_KEY, payment ? JSON.stringify(payment) : null);
