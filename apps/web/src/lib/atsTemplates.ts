import type { AtsTemplates } from "@resume-builder/shared";
import { getTranslator } from "@/lib/i18n";

// Text the ATS algorithm writes INTO resumes. It follows the resume's language, not the site's:
// resumes are English for now, so an Amharic visitor's English resume still gets an English "Skills" heading.
export function getAtsTemplates(): AtsTemplates {
  const t = getTranslator("en");
  return {
    skillsHeading: t("atsTemplates.skillsHeading"),
    summaryHeading: t("atsTemplates.summaryHeading"),
    summaryAddition: t("atsTemplates.summaryAddition"),
    summaryNew: t("atsTemplates.summaryNew"),
    listSeparator: t("atsTemplates.listSeparator"),
    listLastSeparator: t("atsTemplates.listLastSeparator"),
  };
}
