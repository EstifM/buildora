import { BUILDER_LIMITS } from "@resume-builder/shared";

// Lines like "Here is your rewritten resume:" or "Let me know if..." that models add around the answer.
const INTRO_RE = /^(here('s| is)|below is|sure|certainly|of course)\b.*$/i;
const OUTRO_RE = /^(let me know|i hope|feel free|note:|this (rewritten|revised) resume)\b/i;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Turns raw model output into clean, plain resume text.
export function cleanAiOutput(raw: string): string {
  let text = raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    // Reasoning blocks (closed, or cut off before closing).
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
    // Code fences around the whole answer.
    .replace(/^```[a-z]*\n?|```$/gim, "");

  const lines = text.split("\n").map((line) =>
    line
      // "## Skills" -> "Skills"
      .replace(/^\s*#{1,6}\s+/, "")
      // **bold** / __bold__ -> bold
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      // "* item" -> "- item"
      .replace(/^(\s*)\*\s+/, "$1- ")
      .trimEnd(),
  );

  while (lines.length > 0 && (lines[0].trim() === "" || INTRO_RE.test(lines[0].trim()))) lines.shift();
  while (lines.length > 0 && (lines[lines.length - 1].trim() === "" || OUTRO_RE.test(lines[lines.length - 1].trim()))) {
    lines.pop();
  }

  text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text.slice(0, BUILDER_LIMITS.resumeMaxChars);
}
