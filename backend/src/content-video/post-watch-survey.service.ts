import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  aggregateSkillScore,
  clamp,
} from 'src/alcorythm/alcorythm-scoring.util';
import {
  PostWatchSurveyGeminiClient,
  PostWatchSurveyQuestion,
  fallbackQuestions,
} from './post-watch-survey-gemini.client';

@Injectable()
export class PostWatchSurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: PostWatchSurveyGeminiClient,
  ) { }

  private async incrementUsersWatched(contentMediaId: number): Promise<void> {
    await this.prisma.contentStats.upsert({
      where: { contentMediaId },
      create: { contentMediaId, usersWatched: 1 },
      update: { usersWatched: { increment: 1 } },
    });
  }

  private utcCompletionDate(reference: Date): Date {
    return new Date(
      Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        reference.getUTCDate(),
      ),
    );
  }

  private async upsertWatchSessionDaily(
    userId: number,
    contentVideoId: number,
  ): Promise<void> {
    const now = new Date();
    const completionDate = this.utcCompletionDate(now);
    await this.prisma.watchSession.upsert({
      where: {
        userId_contentVideoId_completionDate: {
          userId,
          contentVideoId,
          completionDate,
        },
      },
      create: {
        userId,
        contentVideoId,
        completionDate,
        endedAt: now,
      },
      update: {
        endedAt: now,
      },
    });
  }

  /**
   * Call when the client reports the video finished: bumps watch stats, generates questions (Gemini or fallback), stores survey.
   * Persist a deduped `WatchSession` per user/video/day when `userId` is provided (authenticated SPA flow).
   */
  async recordWatchAndGenerateSurvey(
    contentVideoId: number,
    userId: number | null,
  ): Promise<{
    surveyId: number;
    questions: PostWatchSurveyQuestion[];
  }> {
    const video = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
      omit: { comprehensionTestsCache: true },
    });
    if (!video) {
      throw new NotFoundException(`ContentVideo ${contentVideoId} not found`);
    }

    await this.incrementUsersWatched(video.contentId);

    if (userId != null) {
      await this.upsertWatchSessionDaily(userId, contentVideoId);
      void this.bumpListeningForVideoTopics(userId, contentVideoId).catch(
        () => undefined,
      );
    }

    const geminiQs = await this.gemini.generateQuestions({
      videoName: video.videoName,
      videoDescription: video.videoDescription,
    });
    const questions = geminiQs?.length
      ? geminiQs
      : fallbackQuestions();

    const row = await this.prisma.postWatchSurvey.create({
      data: {
        contentVideoId,
        userId: userId ?? undefined,
        questionsJson: questions,
      },
    });

    return { surveyId: row.id, questions };
  }

  /**
   * Finished watch → small listening boost on topics linked to this video.
   */
  private async bumpListeningForVideoTopics(
    userId: number,
    contentVideoId: number,
  ): Promise<void> {
    const video = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
      include: {
        content: {
          include: {
            stats: { include: { topics: { select: { id: true } } } },
          },
        },
      },
    });
    const topicIds =
      video?.content?.stats?.topics.map((t) => t.id) ?? [];
    if (!topicIds.length) {
      return;
    }

    const listenBump = 0.028;

    for (const topicId of topicIds) {
      const row = await this.prisma.userLanguageData.findUnique({
        where: { userId_topicId: { userId, topicId } },
      });
      if (!row) {
        continue;
      }
      const base = row.score;
      const nl = clamp((row.listeningScore ?? base) + listenBump);
      const nv = row.vocabularyScore ?? base;
      const ng = row.grammarScore ?? base;
      await this.prisma.userLanguageData.update({
        where: { id: row.id },
        data: {
          listeningScore: nl,
          score: aggregateSkillScore(nl, nv, ng),
        },
      });
    }
  }

  async submitSurvey(
    surveyId: number,
    answers: Record<string, unknown>,
  ): Promise<{ ok: true; surveyId: number }> {
    const s = await this.prisma.postWatchSurvey.findUnique({
      where: { id: surveyId },
    });
    if (!s) {
      throw new NotFoundException(`Survey ${surveyId} not found`);
    }
    if (s.submittedAt != null) {
      throw new BadRequestException('Survey already submitted');
    }

    await this.prisma.postWatchSurvey.update({
      where: { id: surveyId },
      data: {
        answersJson: JSON.parse(
          JSON.stringify(answers),
        ) as Prisma.InputJsonValue,
        submittedAt: new Date(),
      },
    });
    return { ok: true, surveyId };
  }
}
