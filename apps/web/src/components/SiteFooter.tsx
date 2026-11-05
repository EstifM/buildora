import type { Locale } from "@resume-builder/shared";
import { getTranslator } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>{t("landing.footer.copyright", { year: new Date().getFullYear() })}</p>
          <p className="text-xs">{t("landing.footer.privacy")}</p>
        </div>
        {/* The legal pages are English only, on every site language. */}
        <nav aria-label={t("landing.footer.legalNav")} className="flex gap-4">
          <a href="/privacy" hrefLang="en" className="font-medium text-slate-600 hover:text-emerald-700 hover:underline">
            {t("landing.footer.privacyLink")}
          </a>
          <a href="/terms" hrefLang="en" className="font-medium text-slate-600 hover:text-emerald-700 hover:underline">
            {t("landing.footer.termsLink")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
