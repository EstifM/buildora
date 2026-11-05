import { neon } from "@neondatabase/serverless";
import type { LeadSource, PlanId } from "@resume-builder/shared";

export type StoredPaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentRecord {
  id: string;
  transactionId: string;
  email: string;
  planId: PlanId;
  amountBirr: number;
  durationDays: number;
  status: StoredPaymentStatus;
  accessTokenHash: string;
  accessExpiresAt: Date | null;
  createdAt: Date;
}

export interface NewPayment {
  transactionId: string;
  email: string;
  planId: PlanId;
  amountBirr: number;
  durationDays: number;
  accessTokenHash: string;
}

export type AttemptOutcome = "created" | "duplicate" | "invalid" | "rate_limited" | "notify_failed";

export interface PaymentAttempt {
  outcome: AttemptOutcome;
  transactionId?: string;
  email?: string;
  planId?: string;
  paymentId?: string;
  ipHash?: string;
}

export interface AiRequestLog {
  paymentId: string;
  outcome: "success" | "ai_error" | "empty_output";
  inputChars: number;
  outputChars: number;
  promptTokens?: number;
  completionTokens?: number;
  truncated: boolean;
}

export interface PaymentRepository {
  // Returns "duplicate" if the transaction ID was ever used before.
  create(payment: NewPayment): Promise<PaymentRecord | "duplicate">;
  findById(id: string): Promise<PaymentRecord | null>;
  findByTokenHash(hash: string): Promise<PaymentRecord | null>;
  listPending(limit: number): Promise<PaymentRecord[]>;
  // Only changes payments that are still pending; returns null otherwise.
  decide(id: string, decision: "approved" | "rejected", decidedBy: string): Promise<PaymentRecord | null>;
  logAttempt(attempt: PaymentAttempt): Promise<void>;
  logAiRequest(entry: AiRequestLog): Promise<void>;
  countAiRequestsSince(paymentId: string, since: Date): Promise<number>;
  // Saves an email once; later calls only update last_source / last_seen_at / times_seen.
  upsertLead(email: string, source: LeadSource): Promise<void>;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Row = Record<string, unknown>;

function toRecord(row: Row): PaymentRecord {
  return {
    id: String(row.id),
    transactionId: String(row.transaction_id),
    email: String(row.email),
    planId: row.plan_id as PlanId,
    amountBirr: Number(row.amount_birr),
    durationDays: Number(row.duration_days),
    status: row.status as StoredPaymentStatus,
    accessTokenHash: String(row.access_token_hash),
    accessExpiresAt: row.access_expires_at ? new Date(row.access_expires_at as string) : null,
    createdAt: new Date(row.created_at as string),
  };
}

// Neon Postgres over HTTP. All queries are parameterized.
export class NeonPaymentRepository implements PaymentRepository {
  private readonly sql;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  private async rows(text: string, params: unknown[]): Promise<Row[]> {
    return (await this.sql.query(text, params)) as Row[];
  }

  async create(payment: NewPayment): Promise<PaymentRecord | "duplicate"> {
    const rows = await this.rows(
      `INSERT INTO payments (transaction_id, email, plan_id, amount_birr, duration_days, access_token_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (transaction_id) DO NOTHING
       RETURNING *`,
      [
        payment.transactionId,
        payment.email,
        payment.planId,
        payment.amountBirr,
        payment.durationDays,
        payment.accessTokenHash,
      ],
    );
    return rows[0] ? toRecord(rows[0]) : "duplicate";
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    if (!UUID_RE.test(id)) return null;
    const rows = await this.rows(`SELECT * FROM payments WHERE id = $1`, [id]);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async findByTokenHash(hash: string): Promise<PaymentRecord | null> {
    const rows = await this.rows(`SELECT * FROM payments WHERE access_token_hash = $1`, [hash]);
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async listPending(limit: number): Promise<PaymentRecord[]> {
    const rows = await this.rows(
      `SELECT * FROM payments WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
      [limit],
    );
    return rows.map(toRecord);
  }

  async decide(id: string, decision: "approved" | "rejected", decidedBy: string): Promise<PaymentRecord | null> {
    if (!UUID_RE.test(id)) return null;
    // Access time starts when the admin approves, not when the user submitted.
    const rows = await this.rows(
      `UPDATE payments
       SET status = $2,
           decided_at = now(),
           decided_by = $3,
           access_expires_at = CASE WHEN $2 = 'approved'
                                    THEN now() + make_interval(days => duration_days)
                                    ELSE NULL END
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, decision, decidedBy],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async logAttempt(attempt: PaymentAttempt): Promise<void> {
    await this.rows(
      `INSERT INTO payment_attempts (outcome, transaction_id, email, plan_id, payment_id, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        attempt.outcome,
        attempt.transactionId ?? null,
        attempt.email ?? null,
        attempt.planId ?? null,
        attempt.paymentId ?? null,
        attempt.ipHash ?? null,
      ],
    );
  }

  async upsertLead(email: string, source: LeadSource): Promise<void> {
    await this.rows(
      `INSERT INTO leads (email, first_source, last_source)
       VALUES ($1, $2, $2)
       ON CONFLICT (email) DO UPDATE
       SET last_source = EXCLUDED.last_source,
           last_seen_at = now(),
           times_seen = leads.times_seen + 1`,
      [email, source],
    );
  }

  async countAiRequestsSince(paymentId: string, since: Date): Promise<number> {
    const rows = await this.rows(
      `SELECT count(*)::int AS n FROM ai_requests WHERE payment_id = $1 AND created_at > $2`,
      [paymentId, since.toISOString()],
    );
    return Number(rows[0]?.n ?? 0);
  }

  async logAiRequest(entry: AiRequestLog): Promise<void> {
    await this.rows(
      `INSERT INTO ai_requests (payment_id, outcome, input_chars, output_chars, prompt_tokens, completion_tokens, truncated)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.paymentId,
        entry.outcome,
        entry.inputChars,
        entry.outputChars,
        entry.promptTokens ?? null,
        entry.completionTokens ?? null,
        entry.truncated,
      ],
    );
  }
}
