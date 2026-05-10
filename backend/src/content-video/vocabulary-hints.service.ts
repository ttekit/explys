import { Injectable } from "@nestjs/common";

export type VocabularyHintDto = {
  translation: string | null;
  pronunciation: string | null;
  meaning: string | null;
};

const DICTIONARY_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

function shortenMeaning(raw: string, max = 220): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

@Injectable()
export class VocabularyHintsService {
  /**
   * Free dictionary (pronunciation + English gloss) + MyMemory (word → target language).
   * Keys in the returned map are normalized to lowercase for reliable client lookup.
   */
  async getHints(
    words: string[],
    targetLang?: string | null,
  ): Promise<Record<string, VocabularyHintDto>> {
    const uniq = [
      ...new Set(
        words
          .map((w) => w.trim())
          .filter((w) => w.length >= 2 && w.length <= 96),
      ),
    ].slice(0, 20);

    const lang = (targetLang ?? "").trim().toLowerCase();
    const wantTranslate = lang.length === 2 && lang !== "en";

    const out: Record<string, VocabularyHintDto> = {};

    await Promise.all(
      uniq.map(async (word) => {
        const key = word.toLowerCase();
        try {
          const [dict, tr] = await Promise.all([
            this.fetchDictionary(word),
            wantTranslate
              ? this.fetchTranslation(word, lang)
              : Promise.resolve<string | null>(null),
          ]);
          out[key] = {
            pronunciation: dict?.pronunciation?.trim() || null,
            meaning: dict?.meaning ? shortenMeaning(dict.meaning) : null,
            translation: tr?.trim() || null,
          };
        } catch {
          out[key] = {
            translation: null,
            pronunciation: null,
            meaning: null,
          };
        }
      }),
    );

    return out;
  }

  private async fetchDictionary(
    word: string,
  ): Promise<{ pronunciation: string; meaning: string } | null> {
    const enc = encodeURIComponent(word);
    const r = await fetch(`${DICTIONARY_BASE}/${enc}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      return null;
    }
    const data = (await r.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    const entry = data[0] as Record<string, unknown>;
    const phonetics = entry.phonetics as { text?: string }[] | undefined;
    let pronunciation = "";
    if (phonetics?.length) {
      pronunciation =
        phonetics.map((p) => p.text).find((t) => t && t.trim())?.trim() ?? "";
    }
    if (!pronunciation && typeof entry.phonetic === "string") {
      pronunciation = entry.phonetic.trim();
    }

    const meanings = entry.meanings as
      | { definitions?: { definition?: string }[] }[]
      | undefined;
    const firstDef = meanings?.[0]?.definitions?.[0]?.definition;
    const meaning =
      typeof firstDef === "string" && firstDef.trim().length > 0
        ? firstDef.trim()
        : "";

    if (!meaning && !pronunciation) {
      return null;
    }
    return { pronunciation: pronunciation || "", meaning: meaning || "" };
  }

  private async fetchTranslation(
    word: string,
    toLang: string,
  ): Promise<string | null> {
    const q = encodeURIComponent(word);
    const r = await fetch(
      `https://api.mymemory.translated.net/get?q=${q}&langpair=en|${encodeURIComponent(toLang)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!r.ok) {
      return null;
    }
    const j = (await r.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const t = j.responseData?.translatedText?.trim();
    if (!t || (j.responseStatus != null && j.responseStatus !== 200)) {
      return null;
    }
    if (t.toLowerCase() === word.toLowerCase()) {
      return null;
    }
    return t;
  }
}
