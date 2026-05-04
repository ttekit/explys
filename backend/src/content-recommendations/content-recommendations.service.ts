import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  blendedVideoTopicKnowledge,
  buildUserThemeTokens,
  cefrBandFit,
  processingComplexityFit,
  videoSystemTagsToCefrUnit,
  userEnglishLevelToCefrUnit,
  userThemeMatchScore,
  topicKnowledgeFit,
  targetProcessingComplexity,
  totalWeightedScore,
  vocabularyStrengthFromTopicScores,
} from './content-recommendation.scoring';

export type UserRecommendationProfileDto = {
  cefrUnit: number;
  cefrSource: string | null;
  vocabularyStrength: number;
  listeningStrength: number;
  targetProcessingComplexity: number;
  themeTokenSample: string[];
  topicRows: number;
};

export type VideoRecommendationItemDto = {
  rank: number;
  score: number;
  breakdown: {
    cefr: number;
    complexity: number;
    themes: number;
    topicKnowledge: number;
  };
  contentVideo: {
    id: number;
    contentId: number;
    videoName: string;
    videoDescription: string | null;
    videoLink: string;
    hasCaptions: boolean;
  };
  content: {
    name: string;
    description: string;
    friendlyLink: string;
  };
  stats: {
    systemTags: string[];
    userTags: string[];
    processingComplexity: number | null;
  } | null;
};

export type ContentRecommendationsResponse = {
  user: UserRecommendationProfileDto;
  recommendations: VideoRecommendationItemDto[];
};

@Injectable()
export class ContentRecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendationsForUser(userId: number): Promise<ContentRecommendationsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        additionalUserData: {
          include: {
            selectedTopics: {
              include: { tags: { select: { name: true } } },
            },
          },
        },
        languageData: {
          include: {
            topic: { include: { tags: { select: { name: true } } } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const profile = user.additionalUserData;
    const englishLabel = profile?.englishLevel?.trim() ?? null;
    const userCefrUnit = userEnglishLevelToCefrUnit(englishLabel);

    const vocabScores = user.languageData.map((ld) => ld.vocabularyScore);
    const listenScores = user.languageData.map((ld) => ld.listeningScore);
    const vocabStrength = vocabularyStrengthFromTopicScores(
      vocabScores,
      userCefrUnit,
    );
    const listenStrength = vocabularyStrengthFromTopicScores(
      listenScores,
      userCefrUnit,
    );
    const loadStrength =
      vocabScores.length || listenScores.length
        ? 0.45 * vocabStrength + 0.55 * listenStrength
        : vocabStrength;

    const targetPc = targetProcessingComplexity(userCefrUnit, loadStrength);

    const strongTopicTagNames: string[] = [];
    for (const ld of user.languageData) {
      const peak = Math.max(
        ld.listeningScore,
        ld.vocabularyScore,
        ld.grammarScore,
      );
      if (peak < 0.45) {
        continue;
      }
      for (const tag of ld.topic.tags) {
        strongTopicTagNames.push(tag.name);
      }
    }

    const selectedTopicNames =
      profile?.selectedTopics?.map((t) => t.name) ?? [];

    const userTokens = buildUserThemeTokens({
      hobbies: profile?.hobbies ?? [],
      interests: profile?.interests ?? [],
      workField: profile?.workField ?? null,
      education: profile?.education ?? null,
      selectedTopicNames,
      strongTopicTagNames,
    });

    const topicIdToUserScore = new Map(
      user.languageData.map((ld) => [
        ld.topicId,
        blendedVideoTopicKnowledge(
          ld.listeningScore,
          ld.vocabularyScore,
          ld.grammarScore,
        ),
      ]),
    );

    const videos = await this.prisma.contentVideo.findMany({
      omit: { comprehensionTestsCache: true },
      orderBy: { id: "asc" },
      include: {
        videoCaption: { select: { id: true } },
        content: {
          include: {
            category: {
              select: { name: true, description: true, friendlyLink: true },
            },
            stats: {
              include: {
                topics: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    const scored: VideoRecommendationItemDto[] = [];
    for (const v of videos) {
      const stats = v.content?.stats;
      const videoCefr = stats
        ? videoSystemTagsToCefrUnit(stats.systemTags)
        : 0.4;
      const vComplexity = stats?.processingComplexity ?? null;
      const videoUserTags = stats?.userTags ?? [];

      const cefr = cefrBandFit(userCefrUnit, videoCefr);
      const complexity = processingComplexityFit(vComplexity, targetPc);
      const themes = userThemeMatchScore(videoUserTags, userTokens);
      const topicIds = stats?.topics.map((t) => t.id) ?? [];
      const topicKnow = topicKnowledgeFit(topicIds, topicIdToUserScore);

      const parts = { cefr, complexity, themes, topicKnowledge: topicKnow };
      const score = totalWeightedScore(parts);

      scored.push({
        rank: 0,
        score,
        breakdown: parts,
        contentVideo: {
          id: v.id,
          contentId: v.contentId,
          videoName: v.videoName,
          videoDescription: v.videoDescription,
          videoLink: v.videoLink,
          hasCaptions: Boolean(v.videoCaption),
        },
        content: {
          name: v.content.category.name,
          description: v.content.category.description,
          friendlyLink: v.content.category.friendlyLink,
        },
        stats: stats
          ? {
              systemTags: stats.systemTags,
              userTags: stats.userTags,
              processingComplexity: stats.processingComplexity,
            }
          : null,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    for (let i = 0; i < scored.length; i++) {
      scored[i].rank = i + 1;
    }

    const themeSample = [...userTokens].slice(0, 12);

    return {
      user: {
        cefrUnit: userCefrUnit,
        cefrSource: englishLabel,
        vocabularyStrength: vocabStrength,
        listeningStrength: listenStrength,
        targetProcessingComplexity: targetPc,
        themeTokenSample: themeSample,
        topicRows: user.languageData.length,
      },
      recommendations: scored.slice(0, 40),
    };
  }
}
