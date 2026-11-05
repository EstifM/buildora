// Input validation shared by the web app and (later) the API. The API must re-check everything.

export const EMAIL_MAX_LENGTH = 254;

// Deliberately simple: something@domain.tld, no spaces. Real proof of ownership comes
// from the one-time code we will email (Phase 4+), not from this check.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(normalized);
}
