import { describe, expect, it } from "vitest";
import { ADMIN_ID, ORIGIN, callbackUpdate, postPayment, postWebhook, setup } from "./helpers";

const valid = { email: " Abebe@Example.com ", planId: "weekly", transactionId: "bkr-3x5 h6gz" };
const DAY_MS = 24 * 60 * 60 * 1000;

async function getStatus(app: ReturnType<typeof setup>["app"], token: string) {
  return app.request("/payments/status", { headers: { Authorization: `Bearer ${token}`, Origin: ORIGIN } });
}

describe("POST /payments", () => {
  it("stores a pending payment, notifies the admin and returns a secret token", async () => {
    const { app, repo, calls } = setup();
    const res = await postPayment(app, valid);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { paymentId: string; accessToken: string; status: string };
    expect(body.status).toBe("pending");
    expect(body.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const [payment] = repo.payments;
    expect(payment).toMatchObject({ transactionId: "BKR3X5H6GZ", email: "abebe@example.com", planId: "weekly", amountBirr: 200, durationDays: 7 });
    expect(payment.accessTokenHash).not.toContain(body.accessToken); // token itself is never stored

    const message = calls.find((c) => c.method === "sendMessage")!;
    expect(message.payload.chat_id).toBe(ADMIN_ID);
    expect(message.payload.text).toContain("BKR3X5H6GZ");
    expect(message.payload.text).toContain("200 ETB");
    expect(message.payload.parse_mode).toBeUndefined(); // plain text, no injection via formatting
    expect(JSON.stringify(message.payload.reply_markup)).toContain(`pay:approve:${payment.id}`);
    expect(repo.attempts.map((a) => a.outcome)).toEqual(["created"]);
    expect(repo.attempts[0].ipHash).toMatch(/^[0-9a-f]{64}$/); // raw IP is never stored
  });

  it("rejects a reused transaction ID, even written differently", async () => {
    const { app, repo, calls } = setup();
    await postPayment(app, valid);
    const res = await postPayment(app, { ...valid, transactionId: "BKR3X5H6GZ", planId: "daily" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "duplicate_transaction" });
    expect(repo.payments).toHaveLength(1);
    expect(calls.filter((c) => c.method === "sendMessage")).toHaveLength(1);
    expect(repo.attempts.map((a) => a.outcome)).toEqual(["created", "duplicate"]);
  });

  it("keeps rejected transaction IDs blocked forever", async () => {
    const { app, repo } = setup();
    await postPayment(app, valid);
    await postWebhook(app, callbackUpdate(Number(ADMIN_ID), `pay:reject:${repo.payments[0].id}`));
    expect((await postPayment(app, valid)).status).toBe(409);
  });

  it.each([
    [{ ...valid, email: "not-an-email" }, "invalid_email"],
    [{ ...valid, planId: "monthly" }, "invalid_plan"],
    [{ ...valid, transactionId: "abc" }, "invalid_transaction_id"],
    [{ ...valid, transactionId: "BKR3X5'; DROP TABLE payments;--" }, "invalid_transaction_id"],
    [{ ...valid, transactionId: 12345678 }, "invalid_transaction_id"],
  ])("validates input (%#)", async (body, error) => {
    const { app, repo } = setup();
    const res = await postPayment(app, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
    expect(repo.payments).toHaveLength(0);
    expect(repo.attempts[0]?.outcome).toBe("invalid");
  });

  it("rejects malformed and oversized bodies", async () => {
    const { app } = setup();
    expect((await postPayment(app, "{not json")).status).toBe(400);
    expect((await postPayment(app, { ...valid, padding: "x".repeat(10_000) })).status).toBe(413);
  });

  it("rate-limits submissions and logs the attempt", async () => {
    const { app, repo } = setup({ paymentLimit: 1 });
    await postPayment(app, valid);
    const res = await postPayment(app, { ...valid, transactionId: "OTHER12345" });
    expect(res.status).toBe(429);
    expect(repo.attempts.at(-1)?.outcome).toBe("rate_limited");
  });

  it("still accepts the payment if Telegram is down, and the admin can recover it with /pending", async () => {
    const { app, repo, calls } = setup({ failSend: true });
    const res = await postPayment(app, valid);
    expect(res.status).toBe(201);
    expect(repo.attempts.map((a) => a.outcome)).toEqual(["notify_failed"]);

    calls.length = 0;
    const update = {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        chat: { id: Number(ADMIN_ID), type: "private", first_name: "Admin" },
        from: { id: Number(ADMIN_ID), is_bot: false, first_name: "Admin" },
        text: "/pending",
        entities: [{ type: "bot_command", offset: 0, length: 8 }],
      },
    };
    await postWebhook(app, update);
    expect(calls.some((c) => c.method === "sendMessage" && String(c.payload.text).includes("BKR3X5H6GZ"))).toBe(true);
  });
});

describe("GET /payments/status", () => {
  it("requires a valid token", async () => {
    const { app } = setup();
    expect((await app.request("/payments/status")).status).toBe(401);
    expect((await getStatus(app, "short")).status).toBe(401);
    expect((await getStatus(app, "A".repeat(43))).status).toBe(404);
  });

  it("reports pending, then approved with an expiry date", async () => {
    const { app, repo } = setup();
    const { accessToken } = (await (await postPayment(app, valid)).json()) as { accessToken: string };
    expect(await (await getStatus(app, accessToken)).json()).toMatchObject({ status: "pending", accessExpiresAt: null });

    await postWebhook(app, callbackUpdate(Number(ADMIN_ID), `pay:approve:${repo.payments[0].id}`));
    const body = (await (await getStatus(app, accessToken)).json()) as { status: string; accessExpiresAt: string };
    expect(body.status).toBe("approved");
    const msLeft = new Date(body.accessExpiresAt).getTime() - Date.now();
    expect(msLeft).toBeGreaterThan(7 * DAY_MS - 60_000);
    expect(msLeft).toBeLessThanOrEqual(7 * DAY_MS);
  });

  it("reports expired access", async () => {
    const { app, repo } = setup();
    const { accessToken } = (await (await postPayment(app, valid)).json()) as { accessToken: string };
    repo.payments[0].status = "approved";
    repo.payments[0].accessExpiresAt = new Date(Date.now() - 1000);
    expect(await (await getStatus(app, accessToken)).json()).toMatchObject({ status: "expired" });
  });
});

describe("Telegram webhook", () => {
  it("ignores requests without the right secret and makes no Telegram calls", async () => {
    const { app, repo, calls } = setup();
    await postPayment(app, valid);
    calls.length = 0;
    const res = await postWebhook(app, callbackUpdate(Number(ADMIN_ID), `pay:approve:${repo.payments[0].id}`), "wrong");
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
    expect(repo.payments[0].status).toBe("pending");
  });

  it("only lets the admin approve", async () => {
    const { app, repo, calls } = setup();
    await postPayment(app, valid);
    await postWebhook(app, callbackUpdate(222, `pay:approve:${repo.payments[0].id}`));
    expect(repo.payments[0].status).toBe("pending");
    expect(calls.at(-1)).toMatchObject({ method: "answerCallbackQuery", payload: { show_alert: true } });
  });

  it("approves once, updates the admin message, and ignores a second tap", async () => {
    const { app, repo, calls } = setup();
    await postPayment(app, valid);
    const id = repo.payments[0].id;

    await postWebhook(app, callbackUpdate(Number(ADMIN_ID), `pay:approve:${id}`));
    expect(repo.payments[0].status).toBe("approved");
    const edit = calls.find((c) => c.method === "editMessageText")!;
    expect(edit.payload.text).toContain("APPROVED");
    expect(edit.payload.reply_markup).toBeUndefined(); // buttons removed

    const expiresAt = repo.payments[0].accessExpiresAt;
    await postWebhook(app, callbackUpdate(Number(ADMIN_ID), `pay:reject:${id}`));
    expect(repo.payments[0].status).toBe("approved");
    expect(repo.payments[0].accessExpiresAt).toBe(expiresAt);
    expect(String(calls.at(-1)?.payload.text)).toContain("already approved");
  });

  it("handles rejection", async () => {
    const { app, repo } = setup();
    const { accessToken } = (await (await postPayment(app, valid)).json()) as { accessToken: string };
    await postWebhook(app, callbackUpdate(Number(ADMIN_ID), `pay:reject:${repo.payments[0].id}`));
    expect(await (await getStatus(app, accessToken)).json()).toMatchObject({ status: "rejected", accessExpiresAt: null });
  });
});

describe("CORS", () => {
  it("allows only configured origins", async () => {
    const { app } = setup();
    const allowed = await app.request("/payments", { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" } });
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    const blocked = await app.request("/payments", { method: "OPTIONS", headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" } });
    expect(blocked.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("security headers", () => {
  it("sends hardening headers and no-store on API responses", async () => {
    const { app } = setup();
    const res = await postPayment(app, valid);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns generic errors without internal details", async () => {
    const env = setup();
    env.repo.create = async () => {
      throw new Error("connection to db.internal:5432 failed (password=hunter2)");
    };
    const res = await postPayment(env.app, valid);
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('{"error":"server_error"}');
  });
});
