"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale, useT } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { localePath } from "@/lib/locale";

const NAV_LINKS: { href: string; labelKey: MessageKey; hideOnPhone?: boolean }[] = [
  // On phones the logo is the home link, which leaves room for the other items.
  { href: "/", labelKey: "nav.home", hideOnPhone: true },
  { href: "/builder", labelKey: "nav.builder" },
  { href: "/guides", labelKey: "nav.guides" },
];

export function SiteHeader() {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4">
        <Link href={localePath(locale, "/")} className="flex min-w-0 items-center gap-2">
          {/* Pre-sized PNG, so no image optimization server is needed. */}
          <Image src="/brand/buildora-icon-96.png" alt="" width={36} height={36} priority unoptimized />
          <span className="truncate text-lg font-bold sm:text-xl tracking-tight text-[#08423f]">{t("common.appName")}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <nav aria-label={t("nav.mainLabel")} className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {NAV_LINKS.map(({ href: path, labelKey, hideOnPhone }) => {
            const href = localePath(locale, path);
            // Guide articles keep "Guides" highlighted.
            const isActive = pathname === href || (path !== "/" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:px-3 ${hideOnPhone ? "hidden sm:block " : ""}${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>
        <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
