import { describe, expect, it } from "vitest";
import { checkConfig, isOriginAllowed, parseAllowedOrigins } from "../src/config";

const good = {
  DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
  TELEGRAM_BOT_TOKEN: "123456789:AAH-abcdefghijklmnopqrstuvwxyz012345",
  TELEGRAM_WEBHOOK_SECRET: "a".repeat(32),
  TELEGRAM_ADMIN_CHAT_ID: "123456789",
  IP_HASH_SALT: "s".repeat(32),
  CORS_ALLOWED_ORIGINS: "https://resume-builder-ethiopia.pages.dev,https://*.resume-builder-ethiopia.pages.dev",
};

describe("CORS origins", () => {
  const { rules } = parseAllowedOrigins(good.CORS_ALLOWED_ORIGINS + ",http://localhost:3000, http://192.168.8.100:3000/");

  it.each([
    "https://resume-builder-ethiopia.pages.dev",
    "https://f897bdec.resume-builder-ethiopia.pages.dev",
    "http://localhost:3000",
    "http://192.168.8.100:3000",
  ])("allows %s", (origin) => expect(isOriginAllowed(origin, rules)).toBe(true));

  it.each([
    "http://resume-builder-ethiopia.pages.dev", // http, not https
    "https://a.b.resume-builder-ethiopia.pages.dev", // wildcard is one level only
    "https://evil-resume-builder-ethiopia.pages.dev", // look-alike
    "https://resume-builder-ethiopia.pages.dev.evil.com",
    "https://evil.com",
    "http://localhost:3001",
    "null",
    "",
  ])("blocks %s", (origin) => expect(isOriginAllowed(origin, rules)).toBe(false));

  it("rejects unsafe or malformed entries", () => {
    const { rules: parsed, invalid } = parseAllowedOrigins("*,https://*,http://example.com,https://*.dev-only,ftp://x.com,https://ok.com/");
    expect(parsed.map((r) => r.raw)).toEqual(["https://ok.com"]);
    // "*.dev-only" is like "*.dev": a wildcard needs a real parent domain.
    expect(invalid).toEqual(["*", "https://*", "http://example.com", "https://*.dev-only", "ftp://x.com"]);
  });
});

describe("checkConfig (fail closed)", () => {
  it("accepts a complete production config", () => {
    expect(checkConfig(good)).toEqual([]);
  });

  it.each([
    ["TELEGRAM_WEBHOOK_SECRET", ""],
    ["TELEGRAM_WEBHOOK_SECRET", "short"],
    ["TELEGRAM_WEBHOOK_SECRET", "has spaces in it!!!!!!!"],
    ["TELEGRAM_ADMIN_CHAT_ID", "me"],
    ["IP_HASH_SALT", "salt"],
    ["DATABASE_URL", "unused-in-tests"],
    ["TELEGRAM_BOT_TOKEN", "unused-in-tests"],
    ["CORS_ALLOWED_ORIGINS", ""],
    ["CORS_ALLOWED_ORIGINS", "*"],
  ])("reports a bad %s", (name, value) => {
    const problems = checkConfig({ ...good, [name]: value });
    expect(problems.some((p) => p.startsWith(name))).toBe(true);
    // Problems name the setting but never include its value.
    if (value.length > 3) expect(problems.join(" ")).not.toContain(value);
  });
});
