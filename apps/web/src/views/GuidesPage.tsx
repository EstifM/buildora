import Link from "next/link";
import type { Locale } from "@resume-builder/shared";
import { JsonLd } from "@/components/JsonLd";
import { formatGuideDate, getGuides, guidePath, guidesIndex, guidesText, type Guide } from "@/lib/guides";
import { localePath } from "@/lib/locale";
import { articleJsonLd } from "@/lib/seo";

function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

function GuideMeta({ guide, locale }: { guide: Guide; locale: Locale }) {
  const text = guidesText(locale);
  return (
    <p className="text-sm text-slate-500">
      <time dateTime={guide.date}>{fill(text.updated, { date: formatGuideDate(guide.date, locale) })}</time>
      <span aria-hidden="true"> · </span>
      {fill(text.readTime, { minutes: guide.readMinutes })}
    </p>
  );
}

export function GuideCard({ guide, locale, linkLabel }: { guide: Guide; locale: Locale; linkLabel: string }) {
  const href = localePath(locale, guidePath(guide.slug));
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="font-semibold text-slate-900">
        <Link href={href} className="hover:text-emerald-700 hover:underline">
          {guide.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{guide.description}</p>
      <Link
        href={href}
        aria-label={`${linkLabel}: ${guide.title}`}
        className="mt-4 text-sm font-semibold text-emerald-700 hover:underline"
      >
        {linkLabel} →
      </Link>
    </article>
  );
}

function BuilderCta({ locale }: { locale: Locale }) {
  const text = guidesText(locale);
  return (
    <aside className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
      <h2 className="text-xl font-bold text-slate-900">{text.ctaTitle}</h2>
      <p className="mx-auto mt-2 max-w-xl text-slate-700">{text.ctaBody}</p>
      <Link
        href={localePath(locale, "/builder")}
        className="mt-5 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        {text.ctaButton}
      </Link>
    </aside>
  );
}

export function GuidesIndexPage({ locale }: { locale: Locale }) {
  const index = guidesIndex(locale);
  const text = guidesText(locale);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{index.title}</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">{index.intro}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {getGuides(locale).map((guide) => (
          <GuideCard key={guide.slug} guide={guide} locale={locale} linkLabel={text.readGuide} />
        ))}
      </div>
      <BuilderCta locale={locale} />
    </div>
  );
}

export function GuideArticlePage({ guide, locale }: { guide: Guide; locale: Locale }) {
  const text = guidesText(locale);
  const others = getGuides(locale).filter((other) => other.slug !== guide.slug);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <JsonLd data={articleJsonLd(guide, locale)} />
      <nav aria-label={text.breadcrumbLabel} className="text-sm text-slate-500">
        <Link href={localePath(locale, "/")} className="hover:underline">
          {text.breadcrumbHome}
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={localePath(locale, "/guides")} className="hover:underline">
          {text.breadcrumbGuides}
        </Link>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{guide.title}</h1>
      <div className="mt-3">
        <GuideMeta guide={guide} locale={locale} />
      </div>
      <p className="mt-6 text-lg leading-8 text-slate-700">{guide.intro}</p>

      <section aria-labelledby="key-points" className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
        <h2 id="key-points" className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          {text.keyPointsTitle}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-800 marker:text-emerald-600">
          {guide.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <div className="mt-10 space-y-9">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7 text-slate-700">
                {paragraph}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-700 marker:text-emerald-600">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <BuilderCta locale={locale} />

      <section aria-labelledby="more-guides" className="mt-12">
        <h2 id="more-guides" className="text-lg font-semibold text-slate-900">
          {text.moreGuides}
        </h2>
        <ul className="mt-3 space-y-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link href={localePath(locale, guidePath(other.slug))} className="font-medium text-emerald-700 hover:underline">
                {other.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
