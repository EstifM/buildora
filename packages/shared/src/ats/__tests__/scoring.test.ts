import { describe, expect, it } from "vitest";
import { improveResume } from "../improve";
import { extractKeywords } from "../keywords";
import { getLexicon } from "../lexicon";
import { scoreAgainstJob } from "../score";
import { detectHeading } from "../sections";
import { stem } from "../text";
import { salesAiRewrite, salesJob, salesResume, templates } from "./fixtures";

const lexicon = getLexicon("en");
const terms = (jd: string) => extractKeywords(jd, lexicon).map((k) => k.term);

describe("word forms", () => {
  it.each([
    ["communicate", "communicated", "communicating", "communication"],
    ["coordinate", "coordinated", "coordinating", "coordination"],
    ["negotiate", "negotiated", "negotiation", "negotiations"],
    ["organize", "organise", "organized", "organization"],
    ["analyze", "analyse", "analysis"],
  ])("treats %s and its forms as the same word", (...forms) => {
    expect(new Set(forms.map(stem)).size).toBe(1);
  });
});

describe("synonyms", () => {
  it("credits 'Customer Relationship Management' for a job asking for CRM", () => {
    const jd = "Experience with CRM software. CRM required.";
    expect(scoreAgainstJob("Skills\nCustomer Relationship Management", jd)).toBeGreaterThan(scoreAgainstJob("Skills\nTyping", jd));
  });

  it("counts a bare 'Excel' in a resume as Microsoft Excel", () => {
    const jd = "Advanced Microsoft Excel skills required.";
    expect(scoreAgainstJob("Skills\nExcel", jd)).toBe(scoreAgainstJob("Skills\nMicrosoft Excel", jd));
  });

  it("detects 'Excel' in a job post only when written as the tool", () => {
    expect(terms("Proficiency in Excel and payroll.")).toContain("Excel");
    expect(terms("You will excel in a fast-paced environment.")).not.toContain("Excel");
  });

  it("never rewrites the verb 'excel' in a resume", () => {
    const result = improveResume("Experience\n- I excel at customer care", "Microsoft Excel and MS Excel skills.", { templates });
    expect(result.improvedText).toContain("I excel at customer care");
  });
});

describe("headings used by AI rewrites", () => {
  it.each([
    ["SUMMARY OF QUALIFICATIONS", "summary"],
    ["Professional Skills", "skills"],
    ["CORE COMPETENCIES:", "skills"],
    ["Professional Background", "experience"],
    ["EDUCATION & CERTIFICATIONS", "education"],
  ])("recognizes %s", (heading, kind) => {
    expect(detectHeading(heading, lexicon)).toBe(kind);
  });
});

describe("AI rewrite scoring", () => {
  it("scores a good AI rewrite higher than the original", () => {
    expect(scoreAgainstJob(salesAiRewrite, salesJob)).toBeGreaterThan(scoreAgainstJob(salesResume, salesJob));
  });

  it("reaches 80+ after the keyword step, and stays honest when the user removes skills", () => {
    const result = improveResume(salesAiRewrite, salesJob, { templates, mode: "keywordsOnly" });
    expect(result.newScore).toBeGreaterThanOrEqual(80);
    expect(result.newScore).toBeLessThanOrEqual(100);

    const tiktok = result.keywords.find((k) => k.term === "TikTok")!;
    const without = improveResume(salesAiRewrite, salesJob, { templates, mode: "keywordsOnly", excludedKeywords: [tiktok.key] });
    expect(without.improvedText).not.toContain("TikTok");
    expect(without.newScore).toBeLessThan(result.newScore);
  });

  it("keywordsOnly mode leaves the AI's summary and bullets as written", () => {
    const result = improveResume(salesAiRewrite, salesJob, { templates, mode: "keywordsOnly" });
    const types = new Set(result.changes.map((c) => c.type));
    expect(types.has("strengthenedBullet")).toBe(false);
    expect(types.has("improvedSummary")).toBe(false);
    expect(types.has("createdSummary")).toBe(false);
    expect(result.improvedText).toContain("Results-driven sales and marketing professional with over 5 years");
  });
});
