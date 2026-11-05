"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { LOCALE_STORAGE_KEY, isLocale, isLocalizedPath, switchLocalePath } from "@/lib/locale";

// If the visitor chose Amharic before and lands on an English page, take them to the
// Amharic version. Explicit /am links are always respected (we never redirect away from them).
export function LocalePreference() {
  const locale = useLocale();

  useEffect(() => {
    // English-only pages (privacy, terms) have no Amharic version: never redirect away from them.
    if (locale !== "en" || !isLocalizedPath(window.location.pathname)) return;
    let preferred: string | null = null;
    try {
      preferred = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      return; // Storage blocked: just stay on English.
    }
    if (isLocale(preferred) && preferred !== locale) {
      const { pathname, search, hash } = window.location;
      window.location.replace(switchLocalePath(pathname, preferred) + search + hash);
    }
  }, [locale]);

  return null;
}
