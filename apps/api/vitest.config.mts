import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Tests must never see real credentials. Wrangler would otherwise load the developer's
// .dev.vars, so every required setting is forced to a placeholder here. (Tests inject fakes
// via createApp(); the real Worker entry must refuse to serve with these placeholders.)
const PLACEHOLDERS = {
	DATABASE_URL: "unused-in-tests",
	TELEGRAM_BOT_TOKEN: "unused-in-tests",
	TELEGRAM_WEBHOOK_SECRET: "unused-in-tests",
	TELEGRAM_ADMIN_CHAT_ID: "unused-in-tests",
	IP_HASH_SALT: "unused-in-tests",
	CORS_ALLOWED_ORIGINS: "unused-in-tests",
};
Object.assign(process.env, PLACEHOLDERS);

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
			// Tests use a fake AI; never connect to Cloudflare (no account or neurons needed).
			remoteBindings: false,
			miniflare: { bindings: PLACEHOLDERS },
		}),
	],
});
