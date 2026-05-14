import { Injectable, NotFoundException } from "@nestjs/common";
import { normalizedLearnerCefrBand } from "./cefr-vocabulary-target.util";
import { nativeLanguageToIso639_1 } from "./native-language-iso.util";
import { PrismaService } from "src/prisma.service";
import { normalizeVocabularyTerm } from "src/user-vocabulary/user-vocabulary.util";
import {
  VocabularyHintDto,
  VocabularyHintsService,
} from "./vocabulary-hints.service";
import { VocabularyPersonalizeGeminiClient } from "./vocabulary-personalize-gemini.client";

const MAX_WORDS = 20;

@Injectable()
export class VocabularyPersonalizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hints: VocabularyHintsService,
    private readonly gemini: VocabularyPersonalizeGeminiClient,
  ) {}

  /**
   * Learner-level English description + native translation; keys are lowercase words/phrases.
   * Best-effort CEFR via Gemini when configured; otherwise dictionary + translation only.
   */
  async personalizeForUser(input: {
    userId: number;
    contentVideoId: number;
    words: string[];
  }): Promise<Record<string, VocabularyHintDto>> {
    const video = await this.prisma.contentVideo.findUnique({
      where: { id: input.contentVideoId },
      select: { id: true },
    });
    if (!video) {
      throw new NotFoundException(`ContentVideo ${input.contentVideoId} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: {
        additionalUserData: {
          select: { englishLevel: true, nativeLanguage: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`User ${input.userId} not found`);
    }

    const ordered: string[] = [];
    const seenNorm = new Set<string>();
    for (const raw of input.words) {
      if (typeof raw !== "string") continue;
      const t = raw.trim();
      if (t.length < 2 || t.length > 96) continue;
      const norm = normalizeVocabularyTerm(t);
      if (norm.length < 2 || seenNorm.has(norm)) continue;
      seenNorm.add(norm);
      ordered.push(t);
      if (ordered.length >= MAX_WORDS) break;
    }

    if (ordered.length === 0) {
      return {};
    }

    const englishLevel = user.additionalUserData?.englishLevel ?? null;
    const learnerBand = normalizedLearnerCefrBand(englishLevel) ?? "B1";
    const nativeRaw = user.additionalUserData?.nativeLanguage?.trim() || null;
    const nativeIso = nativeLanguageToIso639_1(nativeRaw ?? undefined);

    const geminiRows = await this.gemini.personalize({
      words: ordered,
      learnerCefrBand: learnerBand,
      nativeLanguageLabel: nativeRaw,
      nativeLanguageIso: nativeIso,
    });

    const out: Record<string, VocabularyHintDto> = {};
    if (geminiRows) {
      for (const row of geminiRows) {
        const key = row.word.trim().toLowerCase();
        if (key.length < 2) continue;
        out[key] = {
          translation: row.nativeTranslation,
          pronunciation: row.pronunciation,
          meaning: row.learnerDescription,
        };
      }
    }

    const missing = ordered.filter((w) => !out[w.toLowerCase()]);
    if (missing.length > 0) {
      const fallback = await this.hints.getHints(
        missing,
        nativeIso && nativeIso !== "en" ? nativeIso : null,
      );
      for (const w of missing) {
        const key = w.toLowerCase();
        const f = fallback[key];
        if (f && !out[key]) {
          out[key] = f;
        }
      }
    }

    return out;
  }
}
