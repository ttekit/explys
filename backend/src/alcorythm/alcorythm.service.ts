import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from 'src/prisma.service';
import { AlcorythmGeminiTagScoreClient } from './alcorythm-gemini-tag-score.client';
import { TagKnowledgeItem, TopicKnowledgeItem } from './alcorythm.types';
import {
  AI_ALGORITHM_VERSION,
  buildProfileContext,
  calculateConfidence,
  clamp,
  getBaseLevel,
  getDeterministicTagScore,
  getLanguageBackgroundBoost,
  keywordMatchStrength,
  normalizeKeywords,
} from './alcorythm-scoring.util';

@Injectable()
export class AlcorythmService {
  private readonly logger = new Logger(AlcorythmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiTagScoreClient: AlcorythmGeminiTagScoreClient,
  ) {}

  async analyzeUserLevel(userId: number): Promise<TopicKnowledgeItem[]> {
    const prisma = this.prisma as any;

    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          additionalUserData: {
            include: {
              selectedTopics: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        return [];
      }
      throw error;
    }

    if (!user) {
      return [];
    }

    const topics = await prisma.topic.findMany({
      include: {
        tags: true,
      },
    });

    if (!topics.length) {
      await prisma.userLanguageData.deleteMany({
        where: { userId },
      });
      return [];
    }

    const profile = user.additionalUserData;
    if (!profile) {
      return [];
    }

    const profileContext = buildProfileContext(profile);
    const primaryKeywords = normalizeKeywords([
      profileContext.workField,
      profileContext.education,
      profileContext.job,
    ]);
    const secondaryKeywords = normalizeKeywords(profileContext.hobbies ?? []);

    const base = clamp(
      getBaseLevel(profileContext.englishLevel) +
        getLanguageBackgroundBoost({
          nativeLanguage: profileContext.nativeLanguage,
          knownLanguages: profileContext.knownLanguages,
          knownLanguageLevels: profileContext.knownLanguageLevels,
        }),
    );
    const confidence = calculateConfidence({
      hasEnglishLevel: Boolean(profileContext.englishLevel),
      hasLanguageBackground:
        Boolean(profileContext.nativeLanguage) ||
        profileContext.knownLanguages.length > 0 ||
        profileContext.knownLanguageLevels.length > 0,
      hasPrimarySignals: primaryKeywords.length > 0,
      hasSecondarySignals: secondaryKeywords.length > 0,
      hasSelectedTopics: profileContext.selectedTopicIds.size > 0,
    });

    const items = topics.map((topic) => {
      let boost = 0;
      let matchedSignals = 0;
      const totalSignals = 3;

      const primaryStrength = keywordMatchStrength(
        topic.name,
        topic.tags.map((tag) => tag.name),
        primaryKeywords,
      );
      const secondaryStrength = keywordMatchStrength(
        topic.name,
        topic.tags.map((tag) => tag.name),
        secondaryKeywords,
      );
      boost += 0.2 * primaryStrength;
      boost += 0.1 * secondaryStrength;
      matchedSignals += primaryStrength + secondaryStrength;

      if (profileContext.selectedTopicIds.has(topic.id)) {
        boost += 0.2;
        matchedSignals += 1;
      }

      const normalizedComplexity = clamp((topic.complexity ?? 1) / 3);
      const complexityFit = clamp(1 - Math.abs(base - normalizedComplexity));
      boost += 0.1 * complexityFit;

      const score = clamp(base + boost);
      const coverage = clamp(matchedSignals / totalSignals);

      return {
        topicId: topic.id,
        score,
        confidence,
        coverage,
        algorithmVersion: AI_ALGORITHM_VERSION,
      };
    });

    await prisma.userLanguageData.deleteMany({
      where: { userId },
    });

    try {
      await prisma.userLanguageData.createMany({
        data: items.map((item) => ({
          userId,
          topicId: item.topicId,
          score: item.score,
          confidence: item.confidence,
          coverage: item.coverage,
          algorithmVersion: item.algorithmVersion,
        })),
      });
    } catch (firstError: unknown) {
      try {
        await prisma.userLanguageData.createMany({
          data: items.map((item) => ({
            userId,
            topicId: item.topicId,
            score: item.score,
          })),
        });
      } catch (secondError: unknown) {
        this.logger.error(
          "userLanguageData createMany failed after fallback",
          secondError instanceof Error ? secondError.stack : secondError,
        );
        throw firstError;
      }
    }

    void this.analizeUsersLevel(userId).catch(() => {});

    return items;
  }

  async analizeUsersLevel(userId: number): Promise<TagKnowledgeItem[]> {
    const prisma = this.prisma as any;

    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          additionalUserData: {
            include: {
              selectedTopics: {
                include: {
                  tags: true,
                },
              },
            },
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        return [];
      }
      throw error;
    }

    const profile = user?.additionalUserData;
    if (!profile) {
      return [];
    }

    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        topics: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const profileContext = buildProfileContext(profile);
    const base = clamp(
      getBaseLevel(profileContext.englishLevel) +
        getLanguageBackgroundBoost({
          nativeLanguage: profileContext.nativeLanguage,
          knownLanguages: profileContext.knownLanguages,
          knownLanguageLevels: profileContext.knownLanguageLevels,
        }),
    );
    const primaryKeywords = normalizeKeywords([
      profileContext.workField,
      profileContext.education,
      profileContext.job,
    ]);
    const secondaryKeywords = normalizeKeywords(profileContext.hobbies);

    const deterministicByTag: Record<string, number> = {};
    for (const tag of tags) {
      deterministicByTag[tag.name] = getDeterministicTagScore({
        base,
        tagName: tag.name,
        topicNames: (tag.topics ?? []).map((t: any) => t.name),
        primaryKeywords,
        secondaryKeywords,
        selectedTopicIds: profileContext.selectedTopicIds,
        tagTopicIds: (tag.topics ?? []).map((t: any) => t.id),
      });
    }

    const geminiScores = await this.geminiTagScoreClient.scoreTags({
      tagNames: tags.map((tag: any) => tag.name),
      englishLevel: profileContext.englishLevel,
      nativeLanguage: profileContext.nativeLanguage,
      knownLanguages: profileContext.knownLanguages,
      knownLanguageLevels: profileContext.knownLanguageLevels,
      education: profileContext.education,
      workField: profileContext.workField,
      job: profileContext.job,
      hobbies: profileContext.hobbies,
      selectedTopicNames: profileContext.selectedTopicNames,
      deterministicScores: deterministicByTag,
    });

    const result = tags.map((tag: any) => ({
      tag: tag.name,
      level: clamp(geminiScores?.[tag.name] ?? deterministicByTag[tag.name]),
    }));

    return result;
  }
}
