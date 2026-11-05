import type { Lexicon } from "./lexicon";
import type { ResumeSection, SectionKind } from "./types";

// "- item", "• item", "* item", "1. item", "2) item", ...
export const BULLET_RE = /^(\s*(?:[-•*▪‣–◦●·]|\d{1,2}[.)])\s+)(.*)$/;

const MAX_HEADING_LENGTH = 40;

export function detectHeading(line: string, lexicon: Lexicon): Exclude<SectionKind, "preamble"> | null {
  // Strip markdown-ish decoration and a trailing colon: "## Skills:" -> "skills".
  const cleaned = line
    .trim()
    .replace(/^[#*_=\s]+|[*_=:\s]+$/g, "")
    .toLowerCase();
  if (!cleaned || cleaned.length > MAX_HEADING_LENGTH) return null;

  for (const [kind, headings] of Object.entries(lexicon.sectionHeadings)) {
    if (headings.includes(cleaned)) return kind as Exclude<SectionKind, "preamble">;
  }
  return null;
}

export function parseSections(text: string, lexicon: Lexicon): ResumeSection[] {
  const sections: ResumeSection[] = [{ kind: "preamble", heading: null, lines: [] }];
  for (const line of text.split("\n")) {
    const kind = detectHeading(line, lexicon);
    if (kind) {
      sections.push({ kind, heading: line, lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }
  return sections;
}

export function renderSections(sections: readonly ResumeSection[]): string {
  const output: string[] = [];
  for (const section of sections) {
    const lastLine = output[output.length - 1];
    // New sections get a blank line before them so they read as separate blocks.
    if (section.isNew && lastLine !== undefined && lastLine.trim() !== "") output.push("");
    if (section.heading !== null) output.push(section.heading);
    output.push(...section.lines);
  }
  // Drop the empty preamble line we may have produced at the very top.
  while (output.length > 0 && output[0].trim() === "") output.shift();
  return output.join("\n");
}

export function hasContent(section: ResumeSection): boolean {
  return section.lines.some((line) => line.trim() !== "");
}

export function findSection(sections: readonly ResumeSection[], kind: SectionKind): ResumeSection | undefined {
  return sections.find((section) => section.kind === kind && hasContent(section));
}
