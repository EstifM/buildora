import type { Metadata } from "next";
import { PRICING_PLANS, SUPPORTED_LOCALES, type Locale } from "@resume-builder/shared";
import { getTranslator } from "@/lib/i18n";
import { OG_LOCALES, localePath, siteUrl } from "@/lib/locale";

export type SitePage = "home" | "builder";

export const PAGE_PATHS: Record<SitePage, string> = { home: "/", builder: "/builder" };

const OG_IMAGE = { url: "/og/buildora-og.png", width: 1200, height: 630 };

// Every language version of a page, for hreflang links and the sitemap.
export function languageAlternates(page: SitePage): Record<string, string> {
  const path = PAGE_PATHS[page];
  return {
    ...Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, localePath(locale, path)])),
    "x-default": localePath("en", path),
  };
}

// English-only pages (privacy, terms): no language alternates.
export function englishOnlyMetadata(path: string, title: string, description: string): Metadata {
  return {
    metadataBase: siteUrl(),
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Buildora",
      title,
      description,
      url: path,
      locale: OG_LOCALES.en,
      images: [{ ...OG_IMAGE }],
    },
  };
}

export function pageMetadata(locale: Locale, page: SitePage): Metadata {
  const t = getTranslator(locale);
  const title = t(`seo.${page}.title`);
  const description = t(`seo.${page}.description`);
  const url = localePath(locale, PAGE_PATHS[page]);
  const brand = t("common.appName");

  return {
    metadataBase: siteUrl(),
    title,
    description,
    applicationName: brand,
    alternates: { canonical: url, languages: languageAlternates(page) },
    openGraph: {
      type: "website",
      siteName: brand,
      title,
      description,
      url,
      locale: OG_LOCALES[locale],
      alternateLocale: SUPPORTED_LOCALES.filter((other) => other !== locale).map((other) => OG_LOCALES[other]),
      images: [{ ...OG_IMAGE, alt: t("seo.ogImageAlt") }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

// schema.org WebApplication for the landing page (helps search and AI answer engines).
export function landingJsonLd(locale: Locale) {
  const t = getTranslator(locale);
  const base = siteUrl();
  const absolute = (path: string) => new URL(path, base).toString();
  const brand = t("common.appName");

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: brand,
    url: absolute(localePath(locale, "/")),
    description: t("seo.home.description"),
    image: absolute(OG_IMAGE.url),
    inLanguage: locale,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      { "@type": "Offer", name: t("seo.offerFree"), price: "0", priceCurrency: "ETB" },
      ...PRICING_PLANS.map((plan) => ({
        "@type": "Offer",
        name: t(`landing.pricing.${plan.id}.name`),
        description: t(`landing.pricing.${plan.id}.description`),
        price: String(plan.priceBirr),
        priceCurrency: "ETB",
      })),
    ],
  };
}
