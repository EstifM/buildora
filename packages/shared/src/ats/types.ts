import type { Locale } from "../i18n";

export type SectionKind = "preamble" | "summary" | "skills" | "experience" | "education" | "other";

export interface ResumeSection {
  kind: SectionKind;
  // Original heading line; null for the top block (name, contact details).
  heading: string | null;
  lines: string[];
  // True for sections the algorithm created.
  isNew?: boolean;
}

export interface AtsKeyword {
  // How the keyword is shown and written into the resume (the job post's wording).
  term: string;
  // All spellings that count as a match, e.g. ["JavaScript", "JS"].
  variants: string[];
  // Spellings that count as a match but must never be rewritten (e.g. "Excel", which may be a verb).
  matchOnlyVariants?: string[];
  // Stable id used to match and to let the user exclude a keyword.
  key: string;
  weight: number;
  // "skill" = known skill, "tool" = acronym or tool name, "term" = word the job post repeats.
  // Only skills and tools are added to the Skills section; terms are suggestions.
  source: "skill" | "tool" | "term";
}

// Changes are data, not sentences, so the UI can describe them in any language.
export type AtsChange =
  | { type: "createdSkillsSection" }
  | { type: "addedSkills"; keywords: string[] }
  | { type: "createdSummary"; keywords: string[] }
  | { type: "improvedSummary"; keywords: string[] }
  | { type: "strengthenedBullet"; before: string; after: string }
  | { type: "normalizedTerm"; from: string; to: string };

// Text the algorithm writes into the resume. Comes from the i18n messages.
export interface AtsTemplates {
  skillsHeading: string;
  summaryHeading: string;
  // Appended to an existing summary. Must contain {skills}.
  summaryAddition: string;
  // Used when the resume has no summary. Must contain {skills}.
  summaryNew: string;
  listSeparator: string;
  listLastSeparator: string;
}

export interface AtsOptions {
  templates: AtsTemplates;
  locale?: Locale;
  // Keyword keys the user said they don't have; these are never added.
  excludedKeywords?: readonly string[];
  // "full" (Free Build) rewrites bullets and the summary too. "keywordsOnly" is for text that is
  // already well written (AI output): it only uses the job's wording and adds missing skills.
  mode?: "full" | "keywordsOnly";
}

export interface AtsResult {
  originalText: string;
  improvedText: string;
  oldScore: number;
  newScore: number;
  keywords: AtsKeyword[];
  // Already in the original resume.
  matchedKeywords: AtsKeyword[];
  // Added to the Skills section by the algorithm.
  addedKeywords: AtsKeyword[];
  // Still not in the improved resume: excluded skills plus repeated job-post terms.
  missingKeywords: AtsKeyword[];
  changes: AtsChange[];
}
