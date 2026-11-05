import type { Locale } from "@resume-builder/shared";
import am from "../../messages/am.json";
import en from "../../messages/en.json";

type Messages = typeof en;

// To add a language: create messages/<locale>.json with the same keys and register it here.
// TypeScript checks that every language file has exactly the same keys as en.json.
const MESSAGES: Record<Locale, Messages> = { en, am };

// Turns the nested JSON into dotted keys, e.g. "builder.result.placeholder".
type DottedKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : DottedKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = DottedKeys<Messages>;

type Vars = Record<string, string | number>;

export type Translator = (key: MessageKey, vars?: Vars) => string;

function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  let value: unknown = MESSAGES[locale];
  for (const part of key.split(".")) {
    value = (value as Record<string, unknown> | undefined)?.[part];
  }

  if (typeof value !== "string") {
    // Show the key instead of crashing so a missing translation is easy to spot.
    return key;
  }

  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

// Server components call getTranslator(locale); client components use useT() from LocaleProvider.
export function getTranslator(locale: Locale): Translator {
  return (key, vars) => translate(locale, key, vars);
}
