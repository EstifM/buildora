// Low-level text helpers shared by the ATS algorithm.

// Control characters except tab and newline.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‍﻿]/g;

// Words, numbers and tech terms such as "C++", "C#", "Node.js" and ".NET".
const TOKEN_RE = /\.?[\p{L}\p{N}](?:[\p{L}\p{N}+#.]*[\p{L}\p{N}+#])?/gu;

const LETTERS_ONLY = /^\p{L}+$/u;

export interface Token {
  text: string;
  // Lowercased and stemmed, used for matching.
  norm: string;
}

export function cleanText(text: string, maxChars: number): string {
  return text.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").slice(0, maxChars);
}

const SUFFIXES = [
  "ations", "ation", "ating", "ated", "ates", "ate",
  "ments", "ment", "ings", "ing", "ers", "er", "ies", "ied", "ed", "es", "s",
];

// Very small stemmer so word forms match: "manage/managed/managing/management",
// "communicate/communicated/communication", "organize/organise/organization".
export function stem(word: string): string {
  const lower = word.toLowerCase();
  if (!LETTERS_ONLY.test(lower) || lower.length <= 4) return lower;

  // "analysis" -> "analys" (same root as "analyse" / "analyze")
  if (lower.endsWith("ysis")) return lower.slice(0, -2);

  let result = lower;
  for (const suffix of SUFFIXES) {
    if (!result.endsWith(suffix) || result.length - suffix.length < 3) continue;
    if (suffix === "s" && result.endsWith("ss")) break;
    result = result.slice(0, -suffix.length);
    if (suffix === "ies" || suffix === "ied") result += "y";
    break;
  }
  if (result.length > 3 && result.endsWith("e")) result = result.slice(0, -1);
  // American and British spelling: "organiz" and "organis" are the same root.
  return result.replace(/([iy])z$/, "$1s");
}

export function tokenize(text: string): Token[] {
  return Array.from(text.matchAll(TOKEN_RE), ([match]) => ({ text: match, norm: stem(match) }));
}

export function isWord(text: string): boolean {
  return LETTERS_ONLY.test(text);
}

// Normalized form of a phrase, e.g. "Project Managers" -> "project manag".
export function phraseKey(phrase: string): string {
  return tokenize(phrase)
    .map((token) => token.norm)
    .join(" ");
}

export function countSequence(haystack: readonly string[], needle: readonly string[]): number {
  if (needle.length === 0) return 0;
  let count = 0;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((part, j) => haystack[i + j] === part)) count++;
  }
  return count;
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches a whole term but not inside emails, URLs or longer words.
export function termRegExp(term: string, ignoreCase = true): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}.@/_-])${escapeRegExp(term)}(?![\\p{L}\\p{N}@/_-]|\\.[\\p{L}\\p{N}])`,
    ignoreCase ? "giu" : "gu",
  );
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

export function joinList(items: readonly string[], separator: string, lastSeparator: string): string {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(separator) + lastSeparator + items[items.length - 1];
}
