import { describe, expect, it } from "vitest";
import { improveResume } from "../improve";
import { accountantJob, accountantResume, templates } from "./fixtures";

const run = (resume: string, jd: string, excludedKeywords?: string[]) =>
  improveResume(resume, jd, { templates, excludedKeywords });

describe("improveResume", () => {
  it("raises the score and adds missing skills", () => {
    const result = run(accountantResume, accountantJob);
    expect(result.newScore).toBeGreaterThan(result.oldScore);
    expect(result.improvedText).toContain("IFRS");
    expect(result.improvedText).toContain("QuickBooks");
    expect(result.addedKeywords.map((k) => k.term)).toContain("IFRS");
  });

  it("creates a Skills section in the resume's heading style when missing", () => {
    const result = run(accountantResume, accountantJob);
    expect(result.improvedText).toMatch(/^SKILLS$/m);
    expect(result.changes).toContainEqual({ type: "createdSkillsSection" });
  });

  it("adds to an existing Skills section instead of creating a second one", () => {
    const resume = "Experience\n- Built websites\n\nSkills\n- HTML\n- CSS";
    const result = run(resume, "We use React and TypeScript. React experience required.");
    expect(result.improvedText.match(/^Skills$/gm)).toHaveLength(1);
    expect(result.improvedText).toMatch(/^- React, TypeScript$/m);
  });

  it("does not add a keyword twice when it is already there", () => {
    const resume = "Skills\nReact, TypeScript";
    const result = run(resume, "React and TypeScript developer. React, TypeScript.");
    expect(result.addedKeywords).toEqual([]);
    expect(result.changes.some((c) => c.type === "addedSkills")).toBe(false);
    expect(result.improvedText).toMatch(/^Skills\nReact, TypeScript$/m);
  });

  it("only mentions skills the person already has in the summary", () => {
    const result = run(accountantResume, accountantJob);
    const summary = result.changes.find((c) => c.type === "improvedSummary");
    expect(summary).toBeDefined();
    const added = result.addedKeywords.map((k) => k.term);
    for (const keyword of summary && "keywords" in summary ? summary.keywords : []) {
      expect(added).not.toContain(keyword);
    }
  });

  it("strengthens weak bullet openings without inventing content", () => {
    const result = run(accountantResume, accountantJob);
    expect(result.improvedText).toContain("- Prepared monthly financial reports");
    expect(result.improvedText).toContain("- Contributed to the annual audit and bank reconciliation");
    // "accounting" is a noun here, so it is not turned into a verb.
    expect(result.improvedText).toContain("- Managed accounting and payroll for 120 staff");
  });

  it("uses the job post's wording for abbreviations but leaves contact details alone", () => {
    const result = run(accountantResume, accountantJob);
    expect(result.improvedText).toContain("Peachtree and Microsoft Excel");
    expect(result.improvedText).toContain("abebe.js@example.com");
    expect(result.changes).toContainEqual({ type: "normalizedTerm", from: "MS Excel", to: "Microsoft Excel" });
  });

  it("never adds keywords the user excluded", () => {
    const first = run(accountantResume, accountantJob);
    const ifrs = first.keywords.find((k) => k.term === "IFRS")!;
    const result = run(accountantResume, accountantJob, [ifrs.key]);
    expect(result.improvedText).not.toContain("IFRS");
    expect(result.missingKeywords.map((k) => k.key)).toContain(ifrs.key);
    expect(result.newScore).toBeLessThan(first.newScore);
  });

  it("never lowers the score", () => {
    const cases: [string, string][] = [
      [accountantResume, accountantJob],
      ["Just a line of text", "Python developer with SQL and Docker"],
      ["Experience\n- Responsible for leading the team", "Lead a team. Leadership required."],
      ["Skills\nPython, SQL, Docker", "Python developer with SQL and Docker"],
    ];
    for (const [resume, jd] of cases) {
      const result = run(resume, jd);
      expect(result.newScore).toBeGreaterThanOrEqual(result.oldScore);
    }
  });

  it("handles empty and hostile input safely", () => {
    expect(run("", "").improvedText).toBe("");
    const hostile = run("Skills\n(a+)+$ [x] \\d <script>alert(1)</script>", "C++ C++ (a+)+$ [x] \\d");
    expect(hostile.improvedText).toContain("<script>alert(1)</script>"); // Kept as plain text; React escapes it.
    expect(hostile.improvedText).toContain("C++");
  });

  it("returns the original text unchanged when nothing needs improving", () => {
    const resume = "Summary\nPython developer.\n\nSkills\nPython\n\nExperience\n- Built APIs\n- Wrote tests";
    const result = run(resume, "Python developer");
    expect(result.changes).toEqual([]);
    expect(result.improvedText).toBe(resume);
  });
});

describe("scoreAgainstJob", () => {
  it("matches the score improveResume reports", async () => {
    const { scoreAgainstJob } = await import("../score");
    const result = run(accountantResume, accountantJob);
    expect(scoreAgainstJob(accountantResume, accountantJob)).toBe(result.oldScore);
    expect(scoreAgainstJob(result.improvedText, accountantJob)).toBe(result.newScore);
  });
});
