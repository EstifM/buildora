import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

// The test environment only has placeholder settings ("unused-in-tests"), so the real
// Worker entry point must refuse to serve instead of running with weak config.
it("fails closed when settings are missing or malformed", async () => {
  const res = await SELF.fetch("https://api.example/payments/status");
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ error: "server_error" });

  const webhook = await SELF.fetch("https://api.example/telegram/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "unused-in-tests" },
    body: "{}",
  });
  expect(webhook.status).toBe(503);
});
