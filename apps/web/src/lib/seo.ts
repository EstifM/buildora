import type { Metadata } from "next";
import { PRICING_PLANS, SUPPORTED_LOCALES, type Locale } from "@resume-builder/shared";
import { getTranslator } from "@/lib/i18n";
import { guidePath, guidesText, type Guide } from "@/lib/guides";
import { OG_LOCALES, localePath, siteUrl } from "@/lib/locale";

export type SitePage = "home" | "builder";

export const PAGE_PATHS: Record<SitePage, string> = { home: "/", builder: "/builder" };

const OG_IMAGE = { url: "/og/buildora-og.png", width: 1200, height: 630 };

// Every language version of a page, for hreflang links and the sitemap.
export function languageAlternates(page: SitePage): Record<string, string> {
  return pathAlternates(PAGE_PATHS[page]);
}

export function pathAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, localePath(locale, path)])),
    "x-default": localePath("en", path),
  };
}

// English-only pages (privacy, terms): no language alternates.
export function englishOnlyMetadata(
  path: string,
  title: string,
  description: string,
  type: "website" | "article" = "website",
): Metadata {
  return {
    metadataBase: siteUrl(),
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: "Buildora",
      title,
      description,
      url: path,
      locale: OG_LOCALES.en,
      images: [{ ...OG_IMAGE }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

export function pageMetadata(locale: Locale, page: SitePage): Metadata {
  const t = getTranslator(locale);
  return localizedMetadata(locale, PAGE_PATHS[page], t(`seo.${page}.title`), t(`seo.${page}.description`));
}

// Metadata for a page that exists in every language (`path` is the English path, e.g. "/guides").
export function localizedMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
  type: "website" | "article" = "website",
): Metadata {
  const t = getTranslator(locale);
  const url = localePath(locale, path);
  const brand = t("common.appName");

  return {
    metadataBase: siteUrl(),
    title,
    description,
    applicationName: brand,
    alternates: { canonical: url, languages: pathAlternates(path) },
    openGraph: {
      type,
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

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;
const STEP_KEYS = ["step1", "step2", "step3"] as const;
export { FAQ_KEYS };

function organization(base: URL) {
  return {
    "@type": "Organization",
    "@id": new URL("/#organization", base).toString(),
    name: "Buildora",
    url: base.toString(),
    logo: new URL("/brand/buildora-icon-256.png", base).toString(),
    areaServed: "ET",
  };
}

// schema.org data for the landing page (helps search and AI answer engines): the app and its
// prices, who runs it, the three steps and the FAQ. Everything here is also visible on the page.
export function landingJsonLd(locale: Locale) {
  const t = getTranslator(locale);
  const base = siteUrl();
  const absolute = (path: string) => new URL(path, base).toString();
  const brand = t("common.appName");
  const pageUrl = absolute(localePath(locale, "/"));

  const app = {
    "@type": "WebApplication",
    name: brand,
    url: pageUrl,
    description: t("seo.home.description"),
    image: absolute(OG_IMAGE.url),
    inLanguage: locale,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    publisher: { "@id": absolute("/#organization") },
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

  const howTo = {
    "@type": "HowTo",
    name: t("landing.howItWorks.title"),
    inLanguage: locale,
    step: STEP_KEYS.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: t(`landing.howItWorks.${step}.title`),
      text: t(`landing.howItWorks.${step}.description`),
    })),
  };

  const faq = {
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: t(`landing.faq.${key}.question`),
      acceptedAnswer: { "@type": "Answer", text: t(`landing.faq.${key}.answer`) },
    })),
  };

  return { "@context": "https://schema.org", "@graph": [organization(base), app, howTo, faq] };
}

export function articleJsonLd(guide: Guide, locale: Locale) {
  const base = siteUrl();
  const absolute = (path: string) => new URL(localePath(locale, path), base).toString();
  const text = guidesText(locale);
  const url = absolute(guidePath(guide.slug));
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization(base),
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        inLanguage: locale,
        datePublished: guide.date,
        dateModified: guide.date,
        mainEntityOfPage: url,
        image: new URL(OG_IMAGE.url, base).toString(),
        author: { "@type": "Organization", name: text.author, url: base.toString() },
        publisher: { "@id": new URL("/#organization", base).toString() },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: text.breadcrumbHome, item: absolute("/") },
          { "@type": "ListItem", position: 2, name: text.breadcrumbGuides, item: absolute("/guides") },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
    ],
  };
}
