import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@resume-builder/shared";

// English lives at "/", Amharic under "/am". Each language has its own URLs so search
// engines can index both and the right <html lang> and meta tags are pre-rendered.
const PREFIXES: Record<Locale, string> = { en: "", am: "/am" };

export const LOCALE_STORAGE_KEY = "buildora:locale";

// Pages that exist in every language. Others (e.g. /privacy, /terms) are English only.
const LOCALIZED_PATHS = new Set(["/", "/builder", "/guides"]);

function withoutLocalePrefix(pathname: string): string {
  return pathname.replace(/^\/am(?=\/|$)/, "").replace(/\/+$/, "") || "/";
}

export function isLocalizedPath(pathname: string): boolean {
  const path = withoutLocalePrefix(pathname);
  return LOCALIZED_PATHS.has(path) || path.startsWith("/guides/");
}

// For dates and numbers.
export const INTL_LOCALES: Record<Locale, string> = { en: "en-US", am: "am-ET" };

// For Open Graph (og:locale).
export const OG_LOCALES: Record<Locale, string> = { en: "en_US", am: "am_ET" };

export function localePath(locale: Locale, path: string): string {
  const prefix = PREFIXES[locale];
  return path === "/" ? prefix || "/" : `${prefix}${path}`;
}

export function localeFromPath(pathname: string): Locale {
  return pathname === "/am" || pathname.startsWith("/am/") ? "am" : DEFAULT_LOCALE;
}

// The same page in another language: "/am/builder" -> "/builder". Pages that only exist
// in English (e.g. "/privacy") switch to the other language's home page instead of a 404.
export function switchLocalePath(pathname: string, target: Locale): string {
  const path = withoutLocalePrefix(pathname);
  return localePath(target, isLocalizedPath(path) ? path : "/");
}

export function isLocale(value: unknown): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function siteUrl(): URL {
  // Public site address; set NEXT_PUBLIC_SITE_URL to the real domain before launch.
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}
