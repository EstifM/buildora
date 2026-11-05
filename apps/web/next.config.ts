import type { NextConfig } from "next";

// Production safety: on Cloudflare Pages builds (CF_PAGES=1) refuse to build a site that would
// call a localhost API or publish localhost canonical/OG/sitemap URLs.
if (process.env.CF_PAGES === "1") {
  for (const name of ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SITE_URL"]) {
    const value = process.env[name] ?? "";
    if (!value.startsWith("https://")) {
      throw new Error(`${name} must be set to an https:// URL in the Cloudflare Pages build settings.`);
    }
  }
  // "https://f897bdec.my-site.pages.dev" is one specific deployment; canonical links and the
  // sitemap should use the stable production address ("https://my-site.pages.dev" or a custom domain).
  if (/^https:\/\/[0-9a-f]{8}\.[^/]+\.pages\.dev/.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")) {
    console.warn("Warning: NEXT_PUBLIC_SITE_URL points to a single Pages deployment, not the production address.");
  }
}

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages. Security headers are added after the build (scripts/write-headers.mjs).
  output: "export",
  // The shared package ships TypeScript source, so Next needs to compile it.
  transpilePackages: ["@resume-builder/shared"],
  // Dev only: lets you open the dev server from a phone or another computer on your
  // home/office network (e.g. http://192.168.1.5:3000). Without this, Next blocks its
  // dev scripts for those addresses and the page loads but nothing is interactive.
  // Has no effect on production builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
