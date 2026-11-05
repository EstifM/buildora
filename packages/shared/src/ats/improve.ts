import { BUILDER_LIMITS } from "../builder";
import { DEFAULT_LOCALE } from "../i18n";
import { containsKeyword, extractKeywords, textNorms } from "./keywords";
import { getLexicon, type Lexicon, type WeakOpener } from "./lexicon";
import { BULLET_RE, parseSections, renderSections } from "./sections";
import { scoreResume } from "./score";
import { capitalize, cleanText, fillTemplate, joinList, stem, termRegExp } from "./text";
import type { AtsChange, AtsKeyword, AtsOptions, AtsResult, AtsTemplates, ResumeSection } from "./types";

const MAX_SUMMARY_KEYWORDS = 4;

// Improves a resume for a job description without AI:
// matches job keywords, strengthens weak bullet openings, improves the summary
// and adds missing skills. It never adds new experience.
export function improveResume(resumeInput: string, jobInput: string, options: AtsOptions): AtsResult {
  const lexicon = getLexicon(options.locale ?? DEFAULT_LOCALE);
  const excluded = new Set(options.excludedKeywords ?? []);
  const resume = cleanText(resumeInput, BUILDER_LIMITS.resumeMaxChars).trim();
  const jobDescription = cleanText(jobInput, BUILDER_LIMITS.jobDescriptionMaxChars).trim();

  const keywords = extractKeywords(jobDescription, lexicon);
  const originalNorms = textNorms(resume);
  const matchedKeywords = keywords.filter((keyword) => containsKeyword(originalNorms, keyword));

  const sections = parseSections(resume, lexicon);
  const changes: AtsChange[] = [];

  useJobWording(sections, keywords, changes);
  if (options.mode !== "keywordsOnly") {
    strengthenBullets(sections, keywords, textNorms(jobDescription), lexicon, changes);
    improveSummary(sections, matchedKeywords, options.templates, changes);
  }

  const currentNorms = textNorms(renderSections(sections));
  const addedKeywords = keywords.filter(
    (keyword) =>
      keyword.source !== "term" && !excluded.has(keyword.key) && !containsKeyword(currentNorms, keyword),
  );
  addSkills(sections, addedKeywords, options.templates, changes);

  const improvedText = changes.length > 0 ? renderSections(sections) : resume;
  const improvedNorms = textNorms(improvedText);

  return {
    originalText: resume,
    improvedText,
    oldScore: scoreResume(resume, keywords, lexicon),
    newScore: scoreResume(improvedText, keywords, lexicon),
    keywords,
    matchedKeywords,
    addedKeywords,
    missingKeywords: keywords.filter((keyword) => !containsKeyword(improvedNorms, keyword)),
    changes,
  };
}

// Abbreviations and tech names ("JS", "MS Excel", "Node.js") are safe to swap for the
// job post's spelling. Plain words ("audit" vs "auditing") are left alone.
function isTechName(variant: string): boolean {
  return /\B\p{Lu}|[^\p{L} ]/u.test(variant);
}

// If the resume says "JS" but the job post says "JavaScript", use the job post's wording.
function useJobWording(sections: ResumeSection[], keywords: readonly AtsKeyword[], changes: AtsChange[]) {
  for (const keyword of keywords) {
    if (keyword.variants.length < 2 || !keyword.variants.some(isTechName)) continue;

    for (const variant of keyword.variants) {
      if (variant.toLowerCase() === keyword.term.toLowerCase()) continue;
      if (keyword.matchOnlyVariants?.includes(variant)) continue;
      // Abbreviations must match exactly, so "hr" in "8 hr shifts" is not touched.
      const pattern = termRegExp(variant, !isTechName(variant));
      let replaced = false;

      for (const section of sections) {
        if (section.kind === "preamble") continue; // Leave name and contact details untouched.
        section.lines = section.lines.map((line) => {
          const updated = line.replace(pattern, keyword.term);
          if (updated !== line) replaced = true;
          return updated;
        });
      }
      if (replaced) changes.push({ type: "normalizedTerm", from: variant, to: keyword.term });
    }
  }
}

function pickVerb(verbs: readonly string[], jobNorms: ReadonlySet<string>): string {
  const parsed = verbs.map((entry) => {
    const [past, base] = entry.split(":");
    return { past, base };
  });
  return (parsed.find(({ base }) => jobNorms.has(stem(base))) ?? parsed[0]).past;
}

function toPastTense(gerund: string, lexicon: Lexicon): string {
  const lower = gerund.toLowerCase();
  const irregular = lexicon.irregularPast[lower];
  if (irregular) return irregular;
  const base = lower.slice(0, -"ing".length);
  // "applying" -> "applied", "planning" -> "planned", "managing" -> "managed"
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ied`;
  return `${base}ed`;
}

function rewriteOpening(content: string, opener: WeakOpener, jobNorms: ReadonlySet<string>, lexicon: Lexicon) {
  const rest = content.slice(opener.phrase.length).trimStart();
  if (!rest) return null;

  const firstWord = rest.match(/^\p{L}+/u)?.[0] ?? "";
  const isGerund =
    firstWord.length > 5 && firstWord.toLowerCase().endsWith("ing") && !lexicon.nounGerunds.has(firstWord.toLowerCase());

  if (opener.convertGerund && isGerund) {
    return capitalize(toPastTense(firstWord, lexicon)) + rest.slice(firstWord.length);
  }
  return `${pickVerb(opener.verbs, jobNorms)} ${rest}`;
}

// "Responsible for managing the budget" -> "Managed the budget".
function strengthenBullets(
  sections: ResumeSection[],
  keywords: readonly AtsKeyword[],
  jobNormList: readonly string[],
  lexicon: Lexicon,
  changes: AtsChange[],
) {
  const jobNorms = new Set(jobNormList);
  const hasExperience = sections.some((section) => section.kind === "experience");
  const targets = sections.filter((section) =>
    hasExperience ? section.kind === "experience" : section.kind === "preamble" || section.kind === "other",
  );

  for (const section of targets) {
    section.lines = section.lines.map((line) => {
      const bullet = BULLET_RE.exec(line);
      const prefix = bullet ? bullet[1] : (line.match(/^\s*/)?.[0] ?? "");
      const content = bullet ? bullet[2] : line.trimStart();
      const lower = content.toLowerCase();

      const opener = lexicon.weakOpeners.find((candidate) => lower.startsWith(`${candidate.phrase} `));
      if (!opener) return line;

      const rewritten = rewriteOpening(content, opener, jobNorms, lexicon);
      if (!rewritten) return line;

      // Never drop a job keyword that the original bullet already had.
      const before = textNorms(content);
      const after = textNorms(rewritten);
      const losesKeyword = keywords.some((k) => containsKeyword(before, k) && !containsKeyword(after, k));
      if (losesKeyword) return line;

      changes.push({ type: "strengthenedBullet", before: content, after: rewritten });
      return prefix + rewritten;
    });
  }
}

// If the resume writes headings in capitals ("EXPERIENCE"), new headings follow suit.
function matchHeadingStyle(heading: string, sections: readonly ResumeSection[]): string {
  const existing = sections.map((section) => section.heading).filter((h): h is string => h !== null);
  const allCaps = existing.length > 0 && existing.every((h) => h === h.toUpperCase());
  return allCaps ? heading.toUpperCase() : heading;
}

function listOf(terms: readonly string[], templates: AtsTemplates): string {
  return joinList(terms, templates.listSeparator, templates.listLastSeparator);
}

function lastContentIndex(lines: readonly string[]): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== "") return i;
  }
  return -1;
}

// Highlights job keywords the person already has. Never mentions skills they don't list.
function improveSummary(
  sections: ResumeSection[],
  matchedKeywords: readonly AtsKeyword[],
  templates: AtsTemplates,
  changes: AtsChange[],
) {
  const summary = sections.find((section) => section.kind === "summary");
  const summaryNorms = summary ? textNorms(summary.lines.join("\n")) : [];
  const highlights = matchedKeywords
    .filter((keyword) => keyword.source !== "term" && !containsKeyword(summaryNorms, keyword))
    .slice(0, MAX_SUMMARY_KEYWORDS)
    .map((keyword) => keyword.term);
  if (highlights.length === 0) return;

  const skills = listOf(highlights, templates);

  const index = summary ? lastContentIndex(summary.lines) : -1;
  if (summary && index !== -1) {
    const sentence = fillTemplate(templates.summaryAddition, { skills });
    summary.lines[index] = `${summary.lines[index].trimEnd()} ${sentence}`;
    changes.push({ type: "improvedSummary", keywords: highlights });
    return;
  }

  const newSummary = fillTemplate(templates.summaryNew, { skills });
  if (summary) {
    // The resume has a Summary heading with nothing under it.
    summary.lines.unshift(newSummary);
    changes.push({ type: "createdSummary", keywords: highlights });
    return;
  }

  sections.splice(1, 0, {
    kind: "summary",
    heading: matchHeadingStyle(templates.summaryHeading, sections),
    lines: [newSummary, ""],
    isNew: true,
  });
  changes.push({ type: "createdSummary", keywords: highlights });
}

function addSkills(
  sections: ResumeSection[],
  keywords: readonly AtsKeyword[],
  templates: AtsTemplates,
  changes: AtsChange[],
) {
  if (keywords.length === 0) return;
  const terms = keywords.map((keyword) => capitalize(keyword.term));
  const skillsLine = terms.join(templates.listSeparator);

  const skills = sections.find((section) => section.kind === "skills");
  if (skills) {
    // Match the section's style: if it uses bullets, add a bullet.
    const bulletPrefix = skills.lines.map((line) => BULLET_RE.exec(line)?.[1]).find(Boolean) ?? "";
    skills.lines.splice(lastContentIndex(skills.lines) + 1, 0, bulletPrefix + skillsLine);
  } else {
    const summaryIndex = sections.findIndex((section) => section.kind === "summary");
    sections.splice(summaryIndex === -1 ? 1 : summaryIndex + 1, 0, {
      kind: "skills",
      heading: matchHeadingStyle(templates.skillsHeading, sections),
      lines: [skillsLine, ""],
      isNew: true,
    });
    changes.push({ type: "createdSkillsSection" });
  }
  changes.push({ type: "addedSkills", keywords: terms });
}
