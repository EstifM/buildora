// Add a new language here (e.g. "am") and a matching messages file in apps/web/messages/.
export const SUPPORTED_LOCALES = ["en", "am"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
