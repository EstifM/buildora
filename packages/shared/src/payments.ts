import { PRICING_PLANS, type PlanId, type PricingPlan } from "./pricing";

// Where users send money. Not secret: it is shown to every user in the payment popup.
export const PAYMENT_DETAILS = {
  telebirrNumber: "+251921457288",
  accountName: "Estifanos",
} as const;

// Telebirr references look like "BKR3X5H6GZ". We accept letters, digits, spaces and
// dashes, then normalize so "bkr-3x5 h6gz" and "BKR3X5H6GZ" count as the same ID.
export const TRANSACTION_ID_MIN_LENGTH = 6;
export const TRANSACTION_ID_MAX_LENGTH = 32;
// Raw input limit (before removing spaces/dashes).
export const TRANSACTION_ID_INPUT_MAX_LENGTH = 64;

export function normalizeTransactionId(input: string): string {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidTransactionId(input: string): boolean {
  if (input.length > TRANSACTION_ID_INPUT_MAX_LENGTH) return false;
  if (!/^[A-Za-z0-9\s-]*$/.test(input)) return false;
  const normalized = normalizeTransactionId(input);
  return normalized.length >= TRANSACTION_ID_MIN_LENGTH && normalized.length <= TRANSACTION_ID_MAX_LENGTH;
}

export function findPlan(planId: unknown): PricingPlan | undefined {
  return PRICING_PLANS.find((plan) => plan.id === planId);
}

// ---- API contract between the web app and the API ----

export type PaymentStatus = "pending" | "approved" | "rejected" | "expired";

export interface CreatePaymentRequest {
  email: string;
  planId: PlanId;
  transactionId: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  // Secret that proves this browser made the payment. Send as "Authorization: Bearer <token>".
  accessToken: string;
  status: "pending";
}

export interface PaymentStatusResponse {
  paymentId: string;
  planId: PlanId;
  status: PaymentStatus;
  // ISO date; set once approved.
  accessExpiresAt: string | null;
}

// ---- Lead (email) collection ----

export const LEAD_SOURCES = ["payment", "download_unlock", "ai_builder"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface CreateLeadRequest {
  email: string;
  source: Exclude<LeadSource, "payment">; // payments are recorded by the server itself
}

export type ApiErrorCode =
  | "invalid_request"
  | "invalid_email"
  | "invalid_plan"
  | "invalid_transaction_id"
  | "duplicate_transaction"
  | "rate_limited"
  | "unauthorized"
  | "payment_required"
  | "input_too_long"
  | "ai_unavailable"
  | "daily_limit"
  | "not_found"
  | "server_error";

export interface ApiErrorResponse {
  error: ApiErrorCode;
}
