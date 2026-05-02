import { Injectable } from '@nestjs/common';
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
   * that topic’s `language`, with `mastery` at least the user’s score for that topic.
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
          if (row.score > existing.mastery) {
            await this.prisma.userVocabulary.update({
              where: { id: existing.id },
              data: {
                mastery: row.score,
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
              mastery: row.score,
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
}
