import { jsPDF } from "jspdf";
import type { ResumeDocument } from "@resume-builder/shared";

// A4 in points. Simple single-column layout with real text, so ATS can read it.
const MARGIN = 56;
const LINE_HEIGHT = 1.35;
const BULLET_INDENT = 14;
const SIZES = { name: 18, contact: 10, heading: 11.5, body: 10.5 };

// The built-in PDF fonts only cover Western European characters (WinAnsi).
const WIN_ANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const UNSUPPORTED_RE = new RegExp(`[^\\x20-\\x7E\\xA0-\\xFF${WIN_ANSI_EXTRAS}]`, "gu");

function toPdfSafe(text: string): { text: string; dropped: boolean } {
  const replaced = text.replace(/\t/g, " ").replace(/→/g, "->").replace(/[−‐‑]/g, "-");
  const safe = replaced.replace(UNSUPPORTED_RE, "");
  return { text: safe, dropped: safe !== replaced };
}

export function createResumePdf(doc: ResumeDocument, title: string): { blob: Blob; droppedCharacters: boolean } {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;
  let droppedCharacters = false;

  pdf.setProperties({ title: toPdfSafe(title).text });

  function newPageIfNeeded(height: number) {
    if (y + height > pageHeight - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  }

  function write(rawText: string, size: number, options: { bold?: boolean; indent?: number; color?: number } = {}) {
    const { text, dropped } = toPdfSafe(rawText);
    droppedCharacters ||= dropped;
    const indent = options.indent ?? 0;
    pdf.setFont("helvetica", options.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(options.color ?? 20);

    const lineHeight = size * LINE_HEIGHT;
    const lines: string[] = pdf.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line, i) => {
      newPageIfNeeded(lineHeight);
      y += lineHeight;
      if (i === 0 && options.indent) pdf.text("•", MARGIN, y);
      pdf.text(line, MARGIN + indent, y);
    });
  }

  if (doc.name) write(doc.name, SIZES.name, { bold: true });
  for (const line of doc.contactLines) write(line, SIZES.contact, { color: 90 });

  const blocks = [{ heading: "", blocks: doc.intro }, ...doc.sections];
  for (const section of blocks) {
    if (section.heading) {
      y += 12;
      newPageIfNeeded(SIZES.heading * LINE_HEIGHT + 6);
      write(section.heading, SIZES.heading, { bold: true });
      y += 3;
      pdf.setDrawColor(180);
      pdf.line(MARGIN, y, pageWidth - MARGIN, y);
      y += 3;
    } else if (section.blocks.length > 0) {
      y += 8;
    }
    for (const block of section.blocks) {
      write(block.text, SIZES.body, { indent: block.type === "bullet" ? BULLET_INDENT : 0 });
      if (doc.paragraphGap) y += SIZES.body;
    }
  }

  return { blob: pdf.output("blob"), droppedCharacters };
}
