import { describe, expect, it } from "vitest";
import { ORIGIN, postPayment, setup } from "./helpers";

function postLead(app: ReturnType<typeof setup>["app"], body: unknown) {
  return app.request("/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.9" },
    body: JSON.stringify(body),
  });
}

describe("leads", () => {
  it("saves each email once, normalized, and tracks where it came from", async () => {
    const { app, repo } = setup();
    expect((await postLead(app, { email: " Sara@Example.com ", source: "download_unlock" })).status).toBe(204);
    expect((await postLead(app, { email: "sara@example.com", source: "ai_builder" })).status).toBe(204);
    expect([...repo.leads.keys()]).toEqual(["sara@example.com"]);
    expect(repo.leads.get("sara@example.com")).toEqual({ firstSource: "download_unlock", lastSource: "ai_builder", timesSeen: 2 });
  });

  it("saves the email when a payment is submitted, even if the transaction ID is a duplicate", async () => {
    const { app, repo } = setup();
    await postPayment(app, { email: "Abebe@Example.com", planId: "daily", transactionId: "BKR3X5H6GZ" });
    await postPayment(app, { email: "other@example.com", planId: "daily", transactionId: "BKR3X5H6GZ" });
    expect(repo.leads.get("abebe@example.com")?.firstSource).toBe("payment");
    expect(repo.leads.get("other@example.com")?.firstSource).toBe("payment");
  });

  it("does not save invalid payment submissions", async () => {
    const { app, repo } = setup();
    await postPayment(app, { email: "abebe@example.com", planId: "monthly", transactionId: "BKR3X5H6GZ" });
    expect(repo.leads.size).toBe(0);
  });

  it("rejects bad input and the 'payment' source from browsers", async () => {
    const { app, repo } = setup();
    expect((await postLead(app, { email: "not-an-email", source: "ai_builder" })).status).toBe(400);
    expect((await postLead(app, { email: "a@b.com", source: "payment" })).status).toBe(400);
    expect((await postLead(app, { email: "a@b.com" })).status).toBe(400);
    expect((await postLead(app, "nope")).status).toBe(400);
    expect(repo.leads.size).toBe(0);
  });

  it("is rate-limited", async () => {
    const { app } = setup({ leadLimit: 1 });
    expect((await postLead(app, { email: "a@b.com", source: "ai_builder" })).status).toBe(204);
    expect((await postLead(app, { email: "c@d.com", source: "ai_builder" })).status).toBe(429);
  });

  it("never breaks a payment if saving the lead fails", async () => {
    const env = setup();
    env.repo.upsertLead = async () => {
      throw new Error("db down");
    };
    const res = await postPayment(env.app, { email: "a@b.com", planId: "daily", transactionId: "BKR3X5H6GZ" });
    expect(res.status).toBe(201);
  });
});
