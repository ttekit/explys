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
    secondsWatched?: number,
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
        secondsWatched: secondsWatched || 0,
      },
      update: {
        endedAt: now,
        secondsWatched: secondsWatched || 0,
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
    secondsWatched?: number,
  ): Promise<{
    surveyId: number;
    questions: PostWatchSurveyQuestion[];
  }> {
    const video = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
    });
    if (!video) {
      throw new NotFoundException(`ContentVideo ${contentVideoId} not found`);
    }

    await this.incrementUsersWatched(video.contentId);

    if (userId != null) {
      await this.upsertWatchSessionDaily(userId, contentVideoId, secondsWatched);
      await this.updateUserStreak(userId);
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

  private async updateUserStreak(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, lastActivityDate: true },
    });

    if (!user) return;

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let newStreak = user.currentStreak || 0;

    if (!user.lastActivityDate) {
      newStreak = 1;
    } else {
      const lastActivity = new Date(user.lastActivityDate);
      const lastActivityDay = new Date(Date.UTC(lastActivity.getUTCFullYear(), lastActivity.getUTCMonth(), lastActivity.getUTCDate()));

      const diffTime = today.getTime() - lastActivityDay.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { lastActivityDate: now },
        });
        return;
      } else if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        lastActivityDate: now,
      },
    });
  }
}
