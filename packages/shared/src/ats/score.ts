import { BUILDER_LIMITS } from "../builder";
import { DEFAULT_LOCALE, type Locale } from "../i18n";
import { containsKeyword, extractKeywords, textNorms } from "./keywords";
import { getLexicon, type Lexicon } from "./lexicon";
import { cleanText } from "./text";
import { BULLET_RE, findSection, parseSections } from "./sections";
import type { AtsKeyword } from "./types";

// Most of the score is keyword coverage; a little rewards a clear ATS-friendly structure.
const KEYWORD_SHARE = 0.85;
const STRUCTURE_SHARE = 0.15;
const MIN_BULLETS = 2;

// Scores any resume text (e.g. an AI rewrite) against a job description, 0–100.
export function scoreAgainstJob(resumeText: string, jobDescription: string, locale: Locale = DEFAULT_LOCALE): number {
  const lexicon = getLexicon(locale);
  const keywords = extractKeywords(cleanText(jobDescription, BUILDER_LIMITS.jobDescriptionMaxChars), lexicon);
  return scoreResume(cleanText(resumeText, BUILDER_LIMITS.resumeMaxChars), keywords, lexicon);
}

export function scoreResume(text: string, keywords: readonly AtsKeyword[], lexicon: Lexicon): number {
  const norms = textNorms(text);
  const totalWeight = keywords.reduce((sum, keyword) => sum + keyword.weight, 0);
  const matchedWeight = keywords
    .filter((keyword) => containsKeyword(norms, keyword))
    .reduce((sum, keyword) => sum + keyword.weight, 0);
  const coverage = totalWeight > 0 ? matchedWeight / totalWeight : 0;

  const sections = parseSections(text, lexicon);
  const bulletCount = text.split("\n").filter((line) => BULLET_RE.test(line)).length;
  const structureChecks = [
    findSection(sections, "summary") !== undefined,
    findSection(sections, "skills") !== undefined,
    findSection(sections, "experience") !== undefined,
    bulletCount >= MIN_BULLETS,
  ];
  const structure = structureChecks.filter(Boolean).length / structureChecks.length;

  return Math.round(100 * (KEYWORD_SHARE * coverage + STRUCTURE_SHARE * structure));
}
