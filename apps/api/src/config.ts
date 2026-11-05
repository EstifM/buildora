// Production config checks. The Worker refuses to serve (fail closed) if a setting is
// missing or malformed, instead of running with e.g. an empty webhook secret.

export interface OriginRule {
  // "https://buildora.pages.dev" (exact) or "https://*.buildora.pages.dev" (one subdomain label).
  raw: string;
  protocol: string;
  host: string;
  wildcard: boolean;
}

const HOST_RE = /^(?:[a-z0-9-]+\.)*[a-z0-9-]+(?::\d{1,5})?$/;

// Parses "CORS_ALLOWED_ORIGINS": comma-separated origins. Invalid entries are dropped and reported.
export function parseAllowedOrigins(value: string | undefined): { rules: OriginRule[]; invalid: string[] } {
  const rules: OriginRule[] = [];
  const invalid: string[] = [];
  for (const entry of (value ?? "").split(",").map((part) => part.trim().replace(/\/+$/, "")).filter(Boolean)) {
    const match = /^(https?):\/\/(\*\.)?(.+)$/.exec(entry.toLowerCase());
    const host = match?.[3] ?? "";
    const wildcard = Boolean(match?.[2]);
    const isLocal = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(host);
    const ok =
      match !== null &&
      HOST_RE.test(host) &&
      // Plain http only for local development addresses.
      (match[1] === "https" || isLocal) &&
      // Wildcards need a real parent domain (at least "name.tld"), never "*.dev" or "*".
      (!wildcard || (host.split(".").length >= 2 && !isLocal));
    if (ok && match) rules.push({ raw: entry, protocol: match[1], host, wildcard });
    else invalid.push(entry);
  }
  return { rules, invalid };
}

export function isOriginAllowed(origin: string, rules: readonly OriginRule[]): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin !== origin.toLowerCase()) return false; // Must be a bare origin, no path.
  const protocol = url.protocol.replace(":", "");
  return rules.some((rule) => {
    if (rule.protocol !== protocol) return false;
    if (!rule.wildcard) return url.host === rule.host;
    // "*.example.pages.dev" matches exactly one extra label: "abc123.example.pages.dev".
    const suffix = `.${rule.host}`;
    return url.host.endsWith(suffix) && !url.host.slice(0, -suffix.length).includes(".") && url.host.length > suffix.length;
  });
}

export interface ConfigInput {
  DATABASE_URL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_ADMIN_CHAT_ID?: string;
  IP_HASH_SALT?: string;
  CORS_ALLOWED_ORIGINS?: string;
}

// Returns problems by setting NAME only (never values), so it is safe to log.
export function checkConfig(env: ConfigInput): string[] {
  const problems: string[] = [];
  if (!/^postgres(ql)?:\/\/.+/.test(env.DATABASE_URL ?? "")) problems.push("DATABASE_URL is missing or not a Postgres URL");
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(env.TELEGRAM_BOT_TOKEN ?? "")) problems.push("TELEGRAM_BOT_TOKEN is missing or malformed");
  // Telegram allows 1-256 chars of A-Z a-z 0-9 _ -; we require at least 16 to make guessing impossible.
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(env.TELEGRAM_WEBHOOK_SECRET ?? "")) {
    problems.push("TELEGRAM_WEBHOOK_SECRET must be 16-256 characters of A-Z, a-z, 0-9, _ or -");
  }
  if (!/^-?\d{4,20}$/.test(env.TELEGRAM_ADMIN_CHAT_ID ?? "")) problems.push("TELEGRAM_ADMIN_CHAT_ID must be a numeric Telegram ID");
  if ((env.IP_HASH_SALT ?? "").length < 16) problems.push("IP_HASH_SALT must be at least 16 characters");
  const { rules, invalid } = parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS);
  if (rules.length === 0) problems.push("CORS_ALLOWED_ORIGINS has no valid origins");
  if (invalid.length > 0) problems.push(`CORS_ALLOWED_ORIGINS has ${invalid.length} invalid entr${invalid.length === 1 ? "y" : "ies"}`);
  return problems;
}
