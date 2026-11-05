import { describe, expect, it } from "vitest";
import { extractKeywords, MAX_KEYWORDS } from "../keywords";
import { getLexicon } from "../lexicon";
import { accountantJob } from "./fixtures";

const lexicon = getLexicon("en");
const terms = (jd: string) => extractKeywords(jd, lexicon).map((k) => k.term);

describe("extractKeywords", () => {
  it("finds known skills and tools using the job post's spelling", () => {
    const found = terms(accountantJob);
    expect(found).toEqual(expect.arrayContaining(["IFRS", "Payroll", "QuickBooks", "Microsoft Excel"]));
  });

  it("ranks skills mentioned more often higher", () => {
    const found = terms(accountantJob);
    expect(found.indexOf("IFRS")).toBeLessThan(found.indexOf("QuickBooks"));
  });

  it("does not pick the same skill twice under different spellings", () => {
    const found = terms("Experience with CI/CD pipelines. CI/CD is key. Monitoring and Evaluation (M&E) skills.");
    expect(found).toContain("CI/CD");
    expect(found).not.toContain("CI");
    expect(found.filter((t) => t === "M&E" || t === "Monitoring and Evaluation")).toHaveLength(1);
  });

  it("ignores stop words and all-caps heading lines", () => {
    const found = terms("JOB TITLE: DRIVER\nThe and with for the and with for.");
    expect(found).not.toContain("TITLE");
    expect(found).not.toContain("the");
  });

  it("limits the number of keywords", () => {
    const longJd = Array.from({ length: 60 }, (_, i) => `toolname${i} toolname${i}`).join(". ");
    expect(extractKeywords(longJd, lexicon).length).toBeLessThanOrEqual(MAX_KEYWORDS);
  });

  it("returns nothing for an empty job description", () => {
    expect(terms("")).toEqual([]);
  });
});
