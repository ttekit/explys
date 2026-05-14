/**
 * Map profile `nativeLanguage` (often a full name) to ISO 639-1 for translation APIs.
 */
export function nativeLanguageToIso639_1(native: string | undefined): string | undefined {
  if (!native?.trim()) return undefined;
  const n = native.trim().toLowerCase();

  const map: Record<string, string> = {
    ukrainian: "uk",
    "українська": "uk",
    uk: "uk",
    ukr: "uk",
    russian: "ru",
    російська: "ru",
    rus: "ru",
    ru: "ru",
    polish: "pl",
    polski: "pl",
    pl: "pl",
    german: "de",
    deutsch: "de",
    de: "de",
    french: "fr",
    français: "fr",
    fr: "fr",
    spanish: "es",
    español: "es",
    es: "es",
    italian: "it",
    italiano: "it",
    it: "it",
    portuguese: "pt",
    pt: "pt",
    chinese: "zh",
    zh: "zh",
    japanese: "ja",
    ja: "ja",
    korean: "ko",
    ko: "ko",
    arabic: "ar",
    ar: "ar",
    turkish: "tr",
    tr: "tr",
    dutch: "nl",
    nl: "nl",
    swedish: "sv",
    sv: "sv",
    czech: "cs",
    cs: "cs",
    romanian: "ro",
    ro: "ro",
    hungarian: "hu",
    hu: "hu",
    greek: "el",
    el: "el",
    hebrew: "he",
    he: "he",
    hindi: "hi",
    hi: "hi",
    english: "en",
    en: "en",
  };

  if (map[n]) {
    return map[n];
  }

  if (/^[a-z]{2}$/i.test(n)) {
    return n.toLowerCase();
  }
  return undefined;
}

/**
 * ISO 639-1 target language for `/content-video/vocabulary-hints` (MyMemory gloss).
 * Prefers profile native language when it maps to a non-English locale; if not, Ukrainian UI
 * still requests Ukrainian gloss so learners see слова підказкою рідною мовою.
 */
export function vocabularyHintsTargetLang(
  nativeLanguageTrimmed: string | undefined,
  uiLocale: "en" | "uk",
): string | null {
  const fromProfile = nativeLanguageToIso639_1(nativeLanguageTrimmed);
  if (
    fromProfile !== undefined &&
    fromProfile.length === 2 &&
    fromProfile !== "en"
  ) {
    return fromProfile;
  }
  if (uiLocale === "uk") {
    return "uk";
  }
  return null;
}
