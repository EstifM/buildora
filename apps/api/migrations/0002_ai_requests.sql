-- Usage log for the paid AI Builder. Stores sizes and token counts only, never resume text.
CREATE TABLE IF NOT EXISTS ai_requests (
  id                bigserial   PRIMARY KEY,
  payment_id        uuid        NOT NULL REFERENCES payments (id),
  -- success | ai_error | empty_output
  outcome           text        NOT NULL,
  input_chars       integer     NOT NULL,
  output_chars      integer     NOT NULL DEFAULT 0,
  prompt_tokens     integer,
  completion_tokens integer,
  truncated         boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_requests_created_at_idx ON ai_requests (created_at);
CREATE INDEX IF NOT EXISTS ai_requests_payment_id_idx ON ai_requests (payment_id);
