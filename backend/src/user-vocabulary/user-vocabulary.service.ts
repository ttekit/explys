import { Injectable } from '@nestjs/common';
import { normalizedLearnerCefrBand } from 'src/content-video/cefr-vocabulary-target.util';
import { nativeLanguageToIso639_1 } from 'src/content-video/native-language-iso.util';
import { PrismaService } from 'src/prisma.service';
import { normalizeVocabularyTerm } from './user-vocabulary.util';

@Injectable()
export class UserVocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Preferred study language: `UserSettings.studyingLanguage`, else first `UserLanguageData.topic.language`, else `en`.
   */
  async getStudyingLanguageCode(userId: number): Promise<string> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });
    if (settings?.studyingLanguage?.trim()) {
      return settings.studyingLanguage.trim().toLowerCase();
    }
    const first = await this.prisma.userLanguageData.findFirst({
      where: { userId },
      include: { topic: { select: { language: true } } },
      orderBy: { topicId: 'asc' },
    });
    if (first?.topic.language?.trim()) {
      return first.topic.language.trim().toLowerCase();
    }
    return 'en';
  }

  /**
   * Builds vocabulary from each `UserLanguageData` row: every tag on that topic becomes a term in
   * that topic’s `language`, with `mastery` at least the user’s vocabulary skill for that topic.
   */
  async syncFromUserLanguageData(
    userId: number,
  ): Promise<{ studyingLanguage: string; termsTouched: number }> {
    const fallbackLang = await this.getStudyingLanguageCode(userId);
    const rows = await this.prisma.userLanguageData.findMany({
      where: { userId },
      include: {
        topic: { include: { tags: true } },
      },
    });

    let termsTouched = 0;
    for (const row of rows) {
      const lang = (row.topic.language?.trim() || fallbackLang).toLowerCase();
      for (const tag of row.topic.tags) {
        const term = normalizeVocabularyTerm(tag.name);
        if (term.length < 2) {
          continue;
        }
        const existing = await this.prisma.userVocabulary.findUnique({
          where: {
            userId_language_term: { userId, language: lang, term },
          },
        });
        if (existing) {
          if (row.vocabularyScore > existing.mastery) {
            await this.prisma.userVocabulary.update({
              where: { id: existing.id },
              data: {
                mastery: row.vocabularyScore,
                topicId: row.topicId,
                source: 'topic_tags',
              },
            });
          }
        } else {
          await this.prisma.userVocabulary.create({
            data: {
              userId,
              language: lang,
              term,
              topicId: row.topicId,
              mastery: row.vocabularyScore,
              source: 'topic_tags',
            },
          });
        }
        termsTouched += 1;
      }
    }

    return { studyingLanguage: fallbackLang, termsTouched };
  }

  async findByUser(userId: number, language?: string) {
    const where: { userId: number; language?: string } = { userId };
    if (language?.trim()) {
      where.language = language.trim().toLowerCase();
    }
    return this.prisma.userVocabulary.findMany({
      where,
      orderBy: [{ language: 'asc' }, { term: 'asc' }],
      include: {
        topic: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Saves key-lesson vocabulary after the learner submits a comprehension test (idempotent).
   */
  async recordKeyTermsFromLesson(input: {
    userId: number;
    contentVideoId: number;
    terms: string[];
    /** Optional glosses from the client (same session as vocabulary-personalize). */
    details?: Array<{
      term: string;
      nativeTranslation?: string | null;
      learnerDescription?: string | null;
    }>;
  }): Promise<void> {
    if (!input.terms.length) return;
    const language = await this.getStudyingLanguageCode(input.userId);
    const profile = await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: {
        additionalUserData: {
          select: { englishLevel: true, nativeLanguage: true },
        },
      },
    });
    const descriptionCefrBand =
      normalizedLearnerCefrBand(
        profile?.additionalUserData?.englishLevel ?? null,
      ) ?? null;
    const nativeLanguageCode =
      nativeLanguageToIso639_1(
        profile?.additionalUserData?.nativeLanguage ?? undefined,
      ) ?? null;

    const detailByNorm = new Map<
      string,
      { nativeTranslation: string | null; learnerDescription: string | null }
    >();
    for (const row of input.details ?? []) {
      if (!row || typeof row.term !== 'string') continue;
      const norm = normalizeVocabularyTerm(row.term);
      if (norm.length < 2) continue;
      let nativeTranslation: string | null = null;
      if (typeof row.nativeTranslation === 'string') {
        const t = row.nativeTranslation.trim().slice(0, 500);
        nativeTranslation = t.length > 0 ? t : null;
      }
      let learnerDescription: string | null = null;
      if (typeof row.learnerDescription === 'string') {
        const d = row.learnerDescription.trim().slice(0, 2000);
        learnerDescription = d.length > 0 ? d : null;
      }
      detailByNorm.set(norm, { nativeTranslation, learnerDescription });
    }

    const video = await this.prisma.contentVideo.findUnique({
      where: { id: input.contentVideoId },
      select: {
        content: {
          select: {
            stats: {
              select: {
                topics: { take: 1, select: { id: true } },
              },
            },
          },
        },
      },
    });
    const topicId = video?.content?.stats?.topics?.[0]?.id ?? null;
    const source = 'lesson_key_vocabulary';
    for (const raw of input.terms) {
      const term = normalizeVocabularyTerm(raw);
      if (term.length < 2) continue;
      const gloss = detailByNorm.get(term);
      try {
        await this.prisma.userVocabulary.upsert({
          where: {
            userId_language_term: {
              userId: input.userId,
              language,
              term,
            },
          },
          create: {
            userId: input.userId,
            language,
            term,
            source,
            topicId,
            mastery: 0.12,
            ...(gloss?.nativeTranslation != null
              ? { nativeTranslation: gloss.nativeTranslation }
              : {}),
            ...(gloss?.learnerDescription != null
              ? { learnerDescription: gloss.learnerDescription }
              : {}),
            ...(descriptionCefrBand != null
              ? { descriptionCefrBand }
              : {}),
            ...(nativeLanguageCode != null ? { nativeLanguageCode } : {}),
          },
          update: {
            ...(topicId != null ? { topicId } : {}),
            source,
            ...(descriptionCefrBand != null ? { descriptionCefrBand } : {}),
            ...(nativeLanguageCode != null ? { nativeLanguageCode } : {}),
            ...(gloss?.nativeTranslation != null
              ? { nativeTranslation: gloss.nativeTranslation }
              : {}),
            ...(gloss?.learnerDescription != null
              ? { learnerDescription: gloss.learnerDescription }
              : {}),
          },
        });
      } catch {
        /* ignore malformed / duplicate races */
      }
    }
  }
}
