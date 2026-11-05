-- Emails collected from users (one row per email, never duplicated).
-- Sources: payment (submitted a payment), download_unlock (unlocked downloads),
-- ai_builder (tried the AI Builder, including without paying).
CREATE TABLE IF NOT EXISTS leads (
  id            bigserial   PRIMARY KEY,
  email         text        NOT NULL,
  first_source  text        NOT NULL CHECK (first_source IN ('payment', 'download_unlock', 'ai_builder')),
  last_source   text        NOT NULL CHECK (last_source IN ('payment', 'download_unlock', 'ai_builder')),
  times_seen    integer     NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  -- Emails are stored lowercased and trimmed, so this also blocks "A@b.com" vs "a@b.com".
  CONSTRAINT leads_email_unique UNIQUE (email),
  CONSTRAINT leads_email_lowercase CHECK (email = lower(btrim(email)))
);
