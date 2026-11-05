import Image from "next/image";
import Link from "next/link";
import { PRICING_PLANS, type Locale, type PlanId } from "@resume-builder/shared";
import { getTranslator, type MessageKey, type Translator } from "@/lib/i18n";
import { localePath } from "@/lib/locale";
import { landingJsonLd } from "@/lib/seo";

const STEPS = ["step1", "step2", "step3"] as const;
const PLAN_FEATURES = ["feature1", "feature2", "feature3"] as const;
const HIGHLIGHTED_PLAN: PlanId = "weekly";

export function HomePage({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  return (
    <>
      {/* Structured data for search and answer engines. "<" is escaped so the JSON can't break out of the tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd(locale)).replace(/</g, "\\u003c") }}
      />
      <HeroSection t={t} locale={locale} />
      <HowItWorksSection t={t} />
      <PricingSection t={t} />
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
