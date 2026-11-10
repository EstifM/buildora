-- Records which AI feature each request used. Safe to run more than once.
-- Run this BEFORE deploying the API version that adds cover letters.
ALTER TABLE ai_requests
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'rewrite'
  CHECK (kind IN ('rewrite', 'cover_letter'));
