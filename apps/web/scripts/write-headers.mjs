// Writes out/_headers (Cloudflare Pages security headers) after `next build`.
// The Content-Security-Policy only allows network requests to this site and the API origin.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

// Load .env, .env.local, .env.production... exactly like `next build` does, so the CSP
// allows the same API URL that was baked into the site (on Pages, build settings apply too).
nextEnv.loadEnvConfig(fileURLToPath(new URL("..", import.meta.url)));

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn("Warning: NEXT_PUBLIC_API_URL is not set; the CSP will only allow http://localhost:8787.");
}
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").origin;

// 'unsafe-inline' for scripts is required by Next.js static export (inline hydration data);
// everything else is locked to this site.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
`;

writeFileSync(new URL("../out/_headers", import.meta.url), headers);
console.log(`Wrote out/_headers (API origin: ${apiOrigin})`);
