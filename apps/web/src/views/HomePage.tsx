import Image from "next/image";
import Link from "next/link";
import { PRICING_PLANS, type Locale, type PlanId } from "@resume-builder/shared";
import { getTranslator, type MessageKey, type Translator } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import { JsonLd } from "@/components/JsonLd";
import { getGuides } from "@/lib/guides";
import { FAQ_KEYS, landingJsonLd } from "@/lib/seo";
import { GuideCard } from "@/views/GuidesPage";

const STEPS = ["step1", "step2", "step3"] as const;
const PLAN_FEATURES = ["feature1", "feature2", "feature3"] as const;
const HIGHLIGHTED_PLAN: PlanId = "weekly";
const TRUST_ITEMS = ["item1", "item2", "item3", "item4"] as const;
const HOME_GUIDE_COUNT = 3;

export function HomePage({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  return (
    <>
      <JsonLd data={landingJsonLd(locale)} />
      <HeroSection t={t} locale={locale} />
      <HowItWorksSection t={t} />
      <PricingSection t={t} />
      <FaqSection t={t} />
      <GuidesSection t={t} locale={locale} />
    </>
  );
}

function HeroSection({ t, locale }: { t: Translator; locale: Locale }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <Image
          src="/brand/buildora-icon-256.png"
          alt=""
          width={96}
          height={96}
          priority
          unoptimized
          className="mx-auto mb-6 h-20 w-20 sm:h-24 sm:w-24"
        />
        <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {t("landing.hero.badge")}
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {t("landing.hero.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
          {t("landing.hero.description")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={localePath(locale, "/builder")}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:w-auto"
          >
            {t("landing.hero.cta")}
          </Link>
          <a
            href="#pricing"
            className="w-full rounded-xl px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            {t("landing.hero.secondaryCta")}
          </a>
        </div>
        <ul
          aria-label={t("landing.trust.label")}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-600"
        >
          {TRUST_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="font-bold text-emerald-600">
                ✓
              </span>
              {t(`landing.trust.${item}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorksSection({ t }: { t: Translator }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <SectionHeading
        t={t}
        titleKey="landing.howItWorks.title"
        subtitleKey="landing.howItWorks.subtitle"
      />
      <ol className="mt-10 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step} className="rounded-2xl border border-slate-200 bg-white p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
              {index + 1}
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">
              {t(`landing.howItWorks.${step}.title`)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t(`landing.howItWorks.${step}.description`)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PricingSection({ t }: { t: Translator }) {
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <SectionHeading t={t} titleKey="landing.pricing.title" subtitleKey="landing.pricing.subtitle" />
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          {PRICING_PLANS.map((plan) => {
            const isHighlighted = plan.id === HIGHLIGHTED_PLAN;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 ${
                  isHighlighted
                    ? "border-emerald-600 shadow-lg shadow-emerald-100"
                    : "border-slate-200"
                }`}
              >
                {isHighlighted && (
                  <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                    {t("landing.pricing.popular")}
                  </span>
                )}
                <h3 className="font-semibold text-slate-900">
                  {t(`landing.pricing.${plan.id}.name`)}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t(`landing.pricing.${plan.id}.description`)}
                </p>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">{plan.priceBirr}</span>
                  <span className="text-base font-medium text-slate-700">
                    {t("common.currency")}
                  </span>
                  <span className="text-sm text-slate-500">
                    {t("landing.pricing.pricePer", {
                      period: t(`landing.pricing.${plan.id}.period`),
                    })}
                  </span>
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  {PLAN_FEATURES.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden="true" className="font-bold text-emerald-600">
                        ✓
                      </span>
                      {t(`landing.pricing.${plan.id}.${feature}`)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">{t("landing.pricing.payWith")}</p>
      </div>
    </section>
  );
}

// Answers are in the page HTML (closed <details> are still read by search and AI crawlers).
function FaqSection({ t }: { t: Translator }) {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-16">
      <SectionHeading t={t} titleKey="landing.faq.title" subtitleKey="landing.faq.subtitle" />
      <div className="mt-10 space-y-3">
        {FAQ_KEYS.map((key) => (
          <details key={key} className="group rounded-2xl border border-slate-200 bg-white p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <h3 className="font-semibold text-slate-900">{t(`landing.faq.${key}.question`)}</h3>
              <span aria-hidden="true" className="text-xl text-emerald-600 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 leading-7 text-slate-700">{t(`landing.faq.${key}.answer`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function GuidesSection({ t, locale }: { t: Translator; locale: Locale }) {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <SectionHeading t={t} titleKey="landing.guides.title" subtitleKey="landing.guides.subtitle" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {getGuides(locale).slice(0, HOME_GUIDE_COUNT).map((guide) => (
            <GuideCard key={guide.slug} guide={guide} locale={locale} linkLabel={t("landing.guides.readGuide")} />
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link href={localePath(locale, "/guides")} className="font-semibold text-emerald-700 hover:underline">
            {t("landing.guides.allGuides")} →
          </Link>
        </p>
      </div>
    </section>
  );
}

function SectionHeading({
  t,
  titleKey,
  subtitleKey,
}: {
  t: Translator;
  titleKey: MessageKey;
  subtitleKey: MessageKey;
}) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {t(titleKey)}
      </h2>
      <p className="mt-2 text-slate-600">{t(subtitleKey)}</p>
    </div>
  );
}
