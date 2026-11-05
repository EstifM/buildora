import type { SectionKind } from "../types";

export interface WeakOpener {
  // Lowercase phrase at the start of a bullet, e.g. "responsible for".
  phrase: string;
  // Replacement verbs as "Past tense:base form"; the first one the job post uses wins.
  verbs: readonly string[];
  // Turn "responsible for managing X" into "Managed X".
  convertGerund: boolean;
}

export interface Lexicon {
  stopWords: ReadonlySet<string>;
  sectionHeadings: Record<Exclude<SectionKind, "preamble">, readonly string[]>;
  // Groups of spellings for known skills and tools.
  skills: readonly (readonly string[])[];
  weakOpeners: readonly WeakOpener[];
  irregularPast: Readonly<Record<string, string>>;
  nounGerunds: ReadonlySet<string>;
}
