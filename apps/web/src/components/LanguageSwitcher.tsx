"use client";

import { usePathname } from "next/navigation";
import { SUPPORTED_LOCALES, type Locale } from "@resume-builder/shared";
import { useLocale, useT } from "@/components/LocaleProvider";
import { LOCALE_STORAGE_KEY, switchLocalePath } from "@/lib/locale";

function rememberLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage blocked (private mode): the switch still works, it just isn't remembered.
  }
}

// "English | አማርኛ". Each language has its own URL, so these are plain links (a full page load
// is expected when switching root layouts). On phones only the other language is shown.
export function LanguageSwitcher() {
  const t = useT();
  const current = useLocale();
  const pathname = usePathname();

  return (
    <div role="group" aria-label={t("language.switcherLabel")} className="flex shrink-0 items-center">
      <div className="hidden items-center rounded-lg bg-slate-100 p-0.5 sm:flex">
        {SUPPORTED_LOCALES.map((locale) => (
          <a
            key={locale}
            href={switchLocalePath(pathname, locale)}
            hrefLang={locale}
            lang={locale}
            aria-current={locale === current ? "true" : undefined}
            onClick={() => rememberLocale(locale)}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
              locale === current ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t(`language.${locale}`)}
          </a>
        ))}
      </div>
      {SUPPORTED_LOCALES.filter((locale) => locale !== current).map((locale) => (
        <a
          key={locale}
          href={switchLocalePath(pathname, locale)}
          hrefLang={locale}
          lang={locale}
          onClick={() => rememberLocale(locale)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:hidden"
        >
          {t(`language.${locale}`)}
        </a>
      ))}
    </div>
  );
}
