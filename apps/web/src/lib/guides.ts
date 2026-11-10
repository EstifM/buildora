import type { Locale } from "@resume-builder/shared";
import am from "../../messages/guides/am.json";
import en from "../../messages/guides/en.json";
import { INTL_LOCALES } from "@/lib/locale";

// Guide articles. Text lives in messages/guides/<locale>.json (same slugs in every language).
export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  // ISO date (YYYY-MM-DD) of the last update.
  date: string;
  readMinutes: number;
  intro: string;
  keyPoints: string[];
  sections: GuideSection[];
}

const CONTENT: Record<Locale, { common: typeof en.common; index: typeof en.index; articles: Guide[] }> = { en, am };

export const GUIDE_SLUGS = en.articles.map((guide) => guide.slug);
// The /llms.txt summary is English only.
export const llmsText = en.llms;

export function getGuides(locale: Locale): Guide[] {
  return CONTENT[locale].articles;
}

export function guidesText(locale: Locale) {
  return CONTENT[locale].common;
}

export function guidesIndex(locale: Locale) {
  return CONTENT[locale].index;
}

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}

export function findGuide(locale: Locale, slug: string): Guide | undefined {
  return getGuides(locale).find((guide) => guide.slug === slug);
}

export function formatGuideDate(isoDate: string, locale: Locale): string {
  const intlLocale = locale === "en" ? "en-GB" : INTL_LOCALES[locale];
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}
