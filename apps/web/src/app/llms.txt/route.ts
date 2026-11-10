import { PRICING_PLANS } from "@resume-builder/shared";
import { getGuides, guidePath, llmsText } from "@/lib/guides";
import { getTranslator } from "@/lib/i18n";
import { siteUrl } from "@/lib/locale";

// /llms.txt: a plain-text summary of the site for AI assistants. Generated once at build time.
export const dynamic = "force-static";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function GET() {
  const t = getTranslator("en");
  const absolute = (path: string) => new URL(path, siteUrl()).toString();
  const price = (id: string) => String(PRICING_PLANS.find((plan) => plan.id === id)?.priceBirr ?? "");
  const bullets = (items: string[]) => items.map((item) => `- ${item}`);
  const link = (label: string, path: string, note?: string) => `- [${label}](${absolute(path)})${note ? `: ${note}` : ""}`;

  const lines = [
    `# ${t("common.appName")}`,
    "",
    `> ${llmsText.summary}`,
    "",
    `## ${llmsText.whatTitle}`,
    ...bullets(llmsText.what),
    "",
    `## ${llmsText.pricingTitle}`,
    ...bullets(llmsText.pricing.map((item) => item.replace("{daily}", price("daily")).replace("{weekly}", price("weekly")))),
    "",
    `## ${llmsText.privacyTitle}`,
    ...bullets(llmsText.privacy),
    "",
    `## ${llmsText.pagesTitle}`,
    link(llmsText.pageHome, "/"),
    link(llmsText.pageBuilder, "/builder"),
    link(llmsText.pageAmharic, "/am"),
    link(llmsText.pageGuides, "/guides"),
    link(llmsText.pageGuidesAmharic, "/am/guides"),
    link(llmsText.pagePrivacy, "/privacy"),
    link(llmsText.pageTerms, "/terms"),
    "",
    `## ${llmsText.guidesTitle}`,
    ...getGuides("en").map((guide) => link(guide.title, guidePath(guide.slug), guide.description)),
    "",
    `## ${llmsText.faqTitle}`,
    ...FAQ_KEYS.flatMap((key) => [`### ${t(`landing.faq.${key}.question`)}`, t(`landing.faq.${key}.answer`), ""]),
  ];

  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
