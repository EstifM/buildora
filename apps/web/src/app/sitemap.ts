import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@resume-builder/shared";
import { localePath, siteUrl } from "@/lib/locale";
import { PAGE_PATHS, languageAlternates, type SitePage } from "@/lib/seo";

// Generated once at build time (the site is a static export).
export const dynamic = "force-static";

const LOCALIZED_PAGES: { page: SitePage; priority: number }[] = [
  { page: "home", priority: 1 },
  { page: "builder", priority: 0.8 },
];
const ENGLISH_ONLY_PAGES = ["/privacy", "/terms"];

// Every page in every language, each listing its translations (hreflang), plus English-only pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const absolute = (path: string) => new URL(path, siteUrl()).toString();

  const localized = LOCALIZED_PAGES.flatMap(({ page, priority }) =>
    SUPPORTED_LOCALES.map((locale) => ({
      url: absolute(localePath(locale, PAGE_PATHS[page])),
      changeFrequency: "weekly" as const,
      priority,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languageAlternates(page))
            .filter(([lang]) => lang !== "x-default")
            .map(([lang, path]) => [lang, absolute(path)]),
        ),
      },
    })),
  );
  const englishOnly = ENGLISH_ONLY_PAGES.map((path) => ({
    url: absolute(path),
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...localized, ...englishOnly];
}
