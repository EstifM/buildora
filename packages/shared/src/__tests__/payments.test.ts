import { describe, expect, it } from "vitest";
import { findPlan, isValidTransactionId, normalizeTransactionId } from "../payments";

describe("transaction IDs", () => {
  it("normalizes case, spaces and dashes so the same ID can't be reused in another form", () => {
    expect(normalizeTransactionId(" bkr-3x5 h6gz ")).toBe("BKR3X5H6GZ");
    expect(normalizeTransactionId("BKR3X5H6GZ")).toBe(normalizeTransactionId("bkr 3x5-h6gz"));
  });

  it("accepts realistic references", () => {
    expect(isValidTransactionId("BKR3X5H6GZ")).toBe(true);
    expect(isValidTransactionId("bkr 3x5-h6gz")).toBe(true);
  });

  it("rejects empty, short, long or strange input", () => {
    for (const bad of ["", "   ", "AB12", "A".repeat(33), "BKR3X5;DROP", "<script>", "BKR3X5H6GZ💰", "-".repeat(70)]) {
      expect(isValidTransactionId(bad), bad).toBe(false);
    }
  });
});

describe("findPlan", () => {
  it("returns known plans only", () => {
    expect(findPlan("daily")).toMatchObject({ priceBirr: 50, durationDays: 1 });
    expect(findPlan("weekly")).toMatchObject({ priceBirr: 200, durationDays: 7 });
    expect(findPlan("monthly")).toBeUndefined();
    expect(findPlan(undefined)).toBeUndefined();
  });
});
