import { describe, expect, it } from "vitest";
import { toResumeDocument } from "../document";

const resume = `Abebe Kebede
Accountant
abebe@example.com | +251 911 000 000

Detail-oriented accountant.

## SUMMARY:
Accountant with 4 years of experience.

WORK EXPERIENCE
Junior Accountant, Habesha Trading (2020 – 2024)
- Prepared monthly financial reports
• Managed payroll

Skills
IFRS, QuickBooks

Projects`;

describe("toResumeDocument", () => {
  const doc = toResumeDocument(resume);

  it("reads the name and contact lines", () => {
    expect(doc.name).toBe("Abebe Kebede");
    expect(doc.contactLines).toEqual(["Accountant", "abebe@example.com | +251 911 000 000"]);
    expect(doc.intro).toEqual([{ type: "paragraph", text: "Detail-oriented accountant." }]);
  });

  it("splits sections with clean headings", () => {
    expect(doc.sections.map((s) => s.heading)).toEqual(["SUMMARY", "WORK EXPERIENCE", "Skills", "Projects"]);
  });

  it("separates bullets from paragraphs and strips bullet markers", () => {
    expect(doc.sections[1].blocks).toEqual([
      { type: "paragraph", text: "Junior Accountant, Habesha Trading (2020 – 2024)" },
      { type: "bullet", text: "Prepared monthly financial reports" },
      { type: "bullet", text: "Managed payroll" },
    ]);
  });

  it("handles empty text", () => {
    expect(toResumeDocument("")).toEqual({ name: "", contactLines: [], intro: [], sections: [] });
  });
});
