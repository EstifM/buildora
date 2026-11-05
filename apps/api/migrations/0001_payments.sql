-- Payments and audit log for Telebirr manual approval.
-- Apply once to the Neon database (see docs/payments-setup.md).

-- Every submitted transaction ID is stored here forever. The UNIQUE constraint is what
-- guarantees a transaction ID can never be used twice, even under concurrent requests.
CREATE TABLE IF NOT EXISTS payments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    text        NOT NULL,
  email             text        NOT NULL,
  plan_id           text        NOT NULL CHECK (plan_id IN ('daily', 'weekly')),
  amount_birr       integer     NOT NULL CHECK (amount_birr > 0),
  duration_days     integer     NOT NULL CHECK (duration_days > 0),
  status            text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- SHA-256 of the secret token held by the paying browser; the token itself is never stored.
  access_token_hash text        NOT NULL,
  access_expires_at timestamptz,
  decided_at        timestamptz,
  decided_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_transaction_id_unique UNIQUE (transaction_id),
  CONSTRAINT payments_access_token_hash_unique UNIQUE (access_token_hash)
);

-- Make "stored forever" a database rule, not just an app rule.
CREATE OR REPLACE FUNCTION payments_protect_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'payments are permanent and cannot be deleted';
  END IF;
  IF NEW.transaction_id IS DISTINCT FROM OLD.transaction_id THEN
    RAISE EXCEPTION 'transaction_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_no_delete ON payments;
CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_protect_history();

DROP TRIGGER IF EXISTS payments_no_truncate ON payments;
CREATE TRIGGER payments_no_truncate BEFORE TRUNCATE ON payments
  FOR EACH STATEMENT EXECUTE FUNCTION payments_protect_history();

DROP TRIGGER IF EXISTS payments_no_txid_change ON payments;
CREATE TRIGGER payments_no_txid_change BEFORE UPDATE OF transaction_id ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_protect_history();

-- Audit log: one row per payment attempt, including invalid, duplicate and rate-limited ones.
CREATE TABLE IF NOT EXISTS payment_attempts (
  id             bigserial   PRIMARY KEY,
  outcome        text        NOT NULL,
  transaction_id text,
  email          text,
  plan_id        text,
  payment_id     uuid        REFERENCES payments (id),
  -- Salted SHA-256 of the client IP, so abuse can be traced without storing raw IPs.
  ip_hash        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_attempts_created_at_idx ON payment_attempts (created_at);
CREATE INDEX IF NOT EXISTS payment_attempts_transaction_id_idx ON payment_attempts (transaction_id);
