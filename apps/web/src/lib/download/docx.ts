import { BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { ResumeDocument } from "@resume-builder/shared";

// Sizes are in half-points (22 = 11pt). Real headings and bullet lists, no tables or
// text boxes, so ATS parsers read the content in order.
const FONT = "Calibri";

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "B4B4B4", space: 2 } },
    children: [new TextRun({ text })],
  });
}

function bodyParagraph(text: string, isBullet: boolean): Paragraph {
  return new Paragraph({
    ...(isBullet ? { bullet: { level: 0 } } : {}),
    spacing: { after: 60 },
    children: [new TextRun({ text })],
  });
}

export async function createResumeDocx(doc: ResumeDocument, title: string): Promise<Blob> {
  const children: Paragraph[] = [];

  if (doc.name) {
    children.push(new Paragraph({ children: [new TextRun({ text: doc.name, bold: true, size: 36 })] }));
  }
  for (const line of doc.contactLines) {
    children.push(new Paragraph({ children: [new TextRun({ text: line, size: 20, color: "5A5A5A" })] }));
  }
  for (const block of doc.intro) {
    children.push(bodyParagraph(block.text, block.type === "bullet"));
  }
  for (const section of doc.sections) {
    if (section.heading) children.push(sectionHeading(section.heading));
    for (const block of section.blocks) {
      children.push(bodyParagraph(block.text, block.type === "bullet"));
    }
  }

  const document = new Document({
    title,
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: 24, bold: true, color: "141414" },
          paragraph: { spacing: { before: 240, after: 100 } },
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}
