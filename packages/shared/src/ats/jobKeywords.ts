import { BUILDER_LIMITS } from "../builder";
import { DEFAULT_LOCALE, type Locale } from "../i18n";
import { extractKeywords } from "./keywords";
import { getLexicon } from "./lexicon";
import { cleanText } from "./text";

// The job post's most important skills and tools, in its own wording (used to guide the AI).
export function jobKeywordTerms(jobDescription: string, limit = 15, locale: Locale = DEFAULT_LOCALE): string[] {
  const keywords = extractKeywords(cleanText(jobDescription, BUILDER_LIMITS.jobDescriptionMaxChars), getLexicon(locale));
  return keywords
    .filter((keyword) => keyword.source !== "term")
    .slice(0, limit)
    .map((keyword) => keyword.term);
}
