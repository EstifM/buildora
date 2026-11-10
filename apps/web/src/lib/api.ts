import type {
  CreateLeadRequest,
  AiCoverLetterRequest,
  AiCoverLetterResponse,
  AiRewriteRequest,
  AiRewriteResponse,
  ApiErrorCode,
  ApiErrorResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
} from "@resume-builder/shared";

// Public URL of the API Worker (not a secret). Set NEXT_PUBLIC_API_URL in production.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorCode | "network" };

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
    if (response.status === 204) return { ok: true, data: null as T };
    const body = (await response.json().catch(() => null)) as T | ApiErrorResponse | null;
    if (response.ok && body) return { ok: true, data: body as T };
    const error = body && typeof body === "object" && "error" in body ? body.error : "server_error";
    return { ok: false, error };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, error: "network" };
  }
}

export function createPayment(input: CreatePaymentRequest) {
  return request<CreatePaymentResponse>("/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function aiRewrite(accessToken: string, input: AiRewriteRequest, signal?: AbortSignal) {
  return request<AiRewriteResponse>("/ai/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
    signal,
  });
}

export function aiCoverLetter(accessToken: string, input: AiCoverLetterRequest, signal?: AbortSignal) {
  return request<AiCoverLetterResponse>("/ai/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
    signal,
  });
}

// Remembers what was already sent in this tab, so the same email isn't posted again and again.
const sentLeads = new Set<string>();

// Saves an email for follow-up. Fire-and-forget: it never blocks or breaks the page.
export function recordLead(email: string, source: CreateLeadRequest["source"]) {
  const key = `${source}:${email}`;
  if (sentLeads.has(key)) return;
  sentLeads.add(key);
  void request<null>("/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source } satisfies CreateLeadRequest),
    keepalive: true,
  });
}

export function getPaymentStatus(accessToken: string) {
  return request<PaymentStatusResponse>("/payments/status", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
