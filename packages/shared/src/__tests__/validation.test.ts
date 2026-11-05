import { describe, expect, it } from "vitest";
import { EMAIL_MAX_LENGTH, isValidEmail, normalizeEmail } from "../validation";

describe("email validation", () => {
  it("accepts normal addresses and trims/lowercases them", () => {
    expect(isValidEmail("abebe@example.com")).toBe(true);
    expect(isValidEmail("  Sara.T+jobs@Mail.co.et ")).toBe(true);
    expect(normalizeEmail("  Sara@Mail.COM ")).toBe("sara@mail.com");
  });

  it("rejects malformed addresses", () => {
    for (const bad of ["", "abebe", "abebe@", "@example.com", "a b@example.com", "abebe@example", "a@b@c.com", "a@.com"]) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });

  it("rejects overly long addresses quickly", () => {
    const long = `${"a".repeat(EMAIL_MAX_LENGTH)}@example.com`;
    expect(isValidEmail(long)).toBe(false);
    const start = performance.now();
    isValidEmail(`${"a.".repeat(5000)}@`);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
