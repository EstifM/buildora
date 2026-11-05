import type { Locale } from "@resume-builder/shared";
import { BuilderForm } from "@/components/BuilderForm";
import { getTranslator } from "@/lib/i18n";

export function BuilderPage({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t("builder.title")}
        </h1>
        <p className="mt-2 text-slate-600">{t("builder.subtitle")}</p>
      </div>
      <BuilderForm />
    </div>
  );
}
