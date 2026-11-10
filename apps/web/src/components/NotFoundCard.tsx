"use client";

import Image from "next/image";
import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@resume-builder/shared";
import { getTranslator } from "@/lib/i18n";
import { localeFromPath, localePath } from "@/lib/locale";

const MISSING = ["missing1", "missing2", "missing3"] as const;

// A resume sheet that stands in for the "0" in 404.
function ResumeZero() {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 110" className="h-24 w-auto drop-shadow-[0_0_18px_rgb(16_185_129/0.45)] sm:h-32">
      <rect x="6" y="5" width="68" height="100" rx="10" fill="white" stroke="currentColor" strokeWidth="7" />
      <circle cx="27" cy="32" r="8" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round">
        <path d="M43 28h17M43 38h11" opacity="0.55" />
        <path d="M21 56h38M21 70h38M21 84h22" opacity="0.3" />
      </g>
    </svg>
  );
}

// The 404 page, styled like the builder's score card: "ATS match score: 404 out of 100".
export function NotFoundCard() {
  // The same static page is served for every unknown address, so the language is picked
  // from the address after loading ("/am/..." shows Amharic).
  const locale = useSyncExternalStore<Locale>(
    () => () => {},
    () => localeFromPath(window.location.pathname),
    () => "en",
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = getTranslator(locale);
  const home = localePath(locale, "/");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <a href={home} className="mb-8 flex items-center gap-2">
        <Image src="/brand/buildora-icon-96.png" alt="" width={36} height={36} unoptimized />
        <span className="text-xl font-bold tracking-tight text-[#08423f]">{t("common.appName")}</span>
      </a>

      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-[0_0_48px_-12px_rgb(16_185_129/0.6)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("notFound.scoreLabel")}</p>
        <p
          role="img"
          aria-label={t("notFound.scoreAlt")}
          className="mt-4 flex items-center justify-center gap-2 text-8xl font-extrabold leading-none text-emerald-600 [text-shadow:0_0_28px_rgb(16_185_129/0.45)] sm:text-9xl"
        >
          <span aria-hidden="true">4</span>
          <ResumeZero />
          <span aria-hidden="true">4</span>
        </p>
        <p className="mt-2 text-sm text-slate-500">{t("notFound.outOf")}</p>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">{t("notFound.title")}</h1>
        <p className="mt-2 leading-7 text-slate-600">{t("notFound.description")}</p>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("notFound.missingTitle")}</p>
        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {MISSING.map((key) => (
            <li key={key} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-400 line-through">
              {t(`notFound.${key}`)}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={home}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {t("notFound.home")}
          </a>
          <a
            href={localePath(locale, "/builder")}
            className="rounded-xl border-2 border-emerald-600 px-6 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            {t("notFound.builder")}
          </a>
        </div>
      </div>
    </main>
  );
}
