import { DEFAULT_LOCALE, type Locale } from "./i18n";
import { getLexicon } from "./ats/lexicon";
import { BULLET_RE, parseSections } from "./ats/sections";

// A simple layout model of a resume, used to render PDF and DOCX files the same way.

export interface ResumeBlock {
  type: "bullet" | "paragraph";
  text: string;
}

export interface ResumeDocumentSection {
  heading: string;
  blocks: ResumeBlock[];
}

export interface ResumeDocument {
  // First line of the resume, usually the person's name.
  name: string;
  // Lines right under the name (title, phone, email...).
  contactLines: string[];
  // Anything else before the first heading.
  intro: ResumeBlock[];
  sections: ResumeDocumentSection[];
  // Letters: leave a blank line between paragraphs.
  paragraphGap?: boolean;
}

// A cover letter is just paragraphs: no name block, headings or bullets.
export function toLetterDocument(text: string): ResumeDocument {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    name: "",
    contactLines: [],
    intro: paragraphs.map((paragraph) => ({ type: "paragraph", text: paragraph })),
    sections: [],
    paragraphGap: true,
  };
}

function toBlocks(lines: readonly string[]): ResumeBlock[] {
  const blocks: ResumeBlock[] = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    const bullet = BULLET_RE.exec(line);
    blocks.push(bullet ? { type: "bullet", text: bullet[2].trim() } : { type: "paragraph", text: line.trim() });
  }
  return blocks;
}

// "## Skills:" -> "Skills"
function cleanHeading(heading: string): string {
  return heading.trim().replace(/^[#*_=\s]+|[*_=:\s]+$/g, "");
}

export function toResumeDocument(text: string, locale: Locale = DEFAULT_LOCALE): ResumeDocument {
  const [preamble, ...sections] = parseSections(text, getLexicon(locale));

  // Name = first non-empty line; contact = the lines after it until the first blank line.
  const lines = preamble.lines.slice(preamble.lines.findIndex((line) => line.trim() !== ""));
  const name = lines.length > 0 && lines[0] !== undefined ? lines[0].trim() : "";
  const firstBlank = lines.findIndex((line, i) => i > 0 && line.trim() === "");
  const contactEnd = firstBlank === -1 ? lines.length : firstBlank;

  return {
    name,
    contactLines: lines.slice(1, contactEnd).map((line) => line.trim()).filter(Boolean),
    intro: toBlocks(lines.slice(contactEnd)),
    sections: sections
      .map((section) => ({ heading: cleanHeading(section.heading ?? ""), blocks: toBlocks(section.lines) }))
      .filter((section) => section.heading !== "" || section.blocks.length > 0),
  };
}
