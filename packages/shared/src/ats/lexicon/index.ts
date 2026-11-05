import type { Locale } from "../../i18n";
import { en } from "./en";
import type { Lexicon } from "./types";

export type { Lexicon, WeakOpener } from "./types";

// To support a new language, add its lexicon file and register it here.
// The ATS algorithm analyzes the resume's language, not the UI language. Resumes are in English
// for now, so the Amharic UI still uses the English lexicon until an Amharic one exists.
const LEXICONS: Record<Locale, Lexicon> = { en, am: en };

export function getLexicon(locale: Locale): Lexicon {
  return LEXICONS[locale];
}
