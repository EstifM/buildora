import type { Lexicon } from "./lexicon";
import { countSequence, isWord, phraseKey, stem, termRegExp, tokenize } from "./text";
import type { AtsKeyword } from "./types";

export const MAX_KEYWORDS = 20;

// Weights: known skills count most, then acronyms/tool names, then repeated words.
const SKILL_BASE_WEIGHT = 3;
const TOOL_BASE_WEIGHT = 2;
const PHRASE_BONUS = 1;
const MAX_COUNT_BONUS = 3;

// "SAP", "IFRS", "M&E", "CRM" ...
const ACRONYM_RE = /(?<![\p{L}\p{N}.])[A-Z][A-Z0-9&+#]{1,5}(?![\p{L}\p{N}])/gu;
// Mixed-case tool names: "PowerPoint", "QuickBooks", "LinkedIn".
const MIXED_CASE_RE = /(?<![\p{L}\p{N}])\p{Lu}?\p{Ll}+\p{Lu}[\p{L}]*(?![\p{L}\p{N}])/gu;

interface Candidate {
  keyword: AtsKeyword;
  count: number;
  firstIndex: number;
}

function splitIntoClauses(text: string): string[] {
  return text.split(/[.!?;:,()\n•]\s|\n|[;•()]/);
}

export function extractKeywords(jobDescription: string, lexicon: Lexicon): AtsKeyword[] {
  const candidates = new Map<string, Candidate>();
  const jdTokens = tokenize(jobDescription);
  const jdNorms = jdTokens.map((token) => token.norm);
  const lowerJd = jobDescription.toLowerCase();

  // Every spelling of every picked keyword, so we never pick the same thing twice.
  const takenKeys = new Set<string>();
  const isTaken = (term: string) => takenKeys.has(phraseKey(term));
  // "CI" is already covered when we picked "CI/CD".
  const isPartOfTakenPhrase = (term: string) => {
    const key = phraseKey(term);
    return [...takenKeys].some((taken) => taken.includes(" ") && taken.split(" ").includes(key));
  };

  function addCandidate(
    term: string,
    variants: string[],
    weight: number,
    count: number,
    source: AtsKeyword["source"],
  ) {
    const key = phraseKey(variants[0]);
    if (!key || variants.some(isTaken)) return;
    const firstIndex = lowerJd.indexOf(term.toLowerCase());
    candidates.set(key, {
      keyword: { term, variants, key, weight, source },
      count,
      firstIndex: firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex,
    });
    for (const variant of variants) takenKeys.add(phraseKey(variant));
  }

  // 1. Known skills and tools. Use the spelling the job post uses.
  for (const entry of lexicon.skills) {
    const group = entry.filter((variant) => !variant.startsWith("~"));
    const matchOnly = entry.filter((variant) => variant.startsWith("~")).map((variant) => variant.slice(1));
    let best = { variant: group[0], count: 0 };
    let total = 0;
    for (const variant of group) {
      const count = countSequence(jdNorms, phraseKey(variant).split(" "));
      total += count;
      if (count > best.count) best = { variant, count };
    }
    // Match-only spellings count in the job post only when capitalized ("Excel", not "excel at").
    for (const variant of matchOnly) {
      const count = [...jobDescription.matchAll(termRegExp(variant, false))].length;
      total += count;
      if (count > best.count) best = { variant, count };
    }
    if (total > 0) {
      addCandidate(best.variant, [...group], SKILL_BASE_WEIGHT + Math.min(total, MAX_COUNT_BONUS), total, "skill");
      const added = candidates.get(phraseKey(group[0]));
      if (added && matchOnly.length > 0) {
        added.keyword.variants.push(...matchOnly);
        added.keyword.matchOnlyVariants = matchOnly;
      }
    }
  }

  // 2. Acronyms and mixed-case tool names the dictionary doesn't know.
  const toolCounts = new Map<string, number>();
  for (const line of jobDescription.split("\n")) {
    // All-caps lines are usually headings ("JOB TITLE"), not tool names.
    if (line.toUpperCase() === line) continue;
    for (const re of [ACRONYM_RE, MIXED_CASE_RE]) {
      for (const [match] of line.matchAll(re)) {
        if (lexicon.stopWords.has(match.toLowerCase())) continue;
        toolCounts.set(match, (toolCounts.get(match) ?? 0) + 1);
      }
    }
  }
  for (const [term, count] of toolCounts) {
    if (isPartOfTakenPhrase(term)) continue;
    addCandidate(term, [term], TOOL_BASE_WEIGHT + Math.min(count, MAX_COUNT_BONUS), count, "tool");
  }

  // 3. Words and two-word phrases the job post repeats.
  const wordCounts = new Map<string, { term: string; count: number }>();
  const pairCounts = new Map<string, { term: string; count: number }>();
  const isUseful = (text: string) => isWord(text) && text.length >= 3 && !lexicon.stopWords.has(text.toLowerCase());

  for (const clause of splitIntoClauses(jobDescription)) {
    const tokens = tokenize(clause);
    tokens.forEach((token, i) => {
      if (!isUseful(token.text)) return;
      const word = wordCounts.get(token.norm) ?? { term: token.text.toLowerCase(), count: 0 };
      word.count++;
      wordCounts.set(token.norm, word);

      const next = tokens[i + 1];
      if (next && isUseful(next.text)) {
        const pairKey = `${token.norm} ${next.norm}`;
        const pair = pairCounts.get(pairKey) ?? { term: `${token.text} ${next.text}`.toLowerCase(), count: 0 };
        pair.count++;
        pairCounts.set(pairKey, pair);
      }
    });
  }

  const repeatedPairs = [...pairCounts.entries()].filter(([, pair]) => pair.count >= 2);
  for (const [, pair] of repeatedPairs) {
    addCandidate(pair.term, [pair.term], Math.min(pair.count, MAX_COUNT_BONUS) + PHRASE_BONUS, pair.count, "term");
  }
  for (const [key, word] of wordCounts) {
    if (word.count < 2 || isTaken(word.term)) continue;
    // Skip a word if it only ever appears inside a phrase we already picked.
    const coveredByPhrase = [...candidates.values()].some(
      (candidate) => candidate.keyword.key.split(" ").includes(key) && candidate.count >= word.count,
    );
    if (!coveredByPhrase) {
      addCandidate(word.term, [word.term], Math.min(word.count, MAX_COUNT_BONUS), word.count, "term");
    }
  }

  return [...candidates.values()]
    .sort((a, b) => b.keyword.weight - a.keyword.weight || a.firstIndex - b.firstIndex)
    .slice(0, MAX_KEYWORDS)
    .map((candidate) => candidate.keyword);
}

// Normalized tokens of a text, computed once and reused for many keyword checks.
export function textNorms(text: string): string[] {
  return tokenize(text).map((token) => token.norm);
}

export function containsKeyword(norms: readonly string[], keyword: AtsKeyword): boolean {
  return keyword.variants.some((variant) => countSequence(norms, phraseKey(variant).split(" ")) > 0);
}

export function containsWord(norms: readonly string[], word: string): boolean {
  return norms.includes(stem(word));
}
