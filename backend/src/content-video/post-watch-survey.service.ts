import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma.service';
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
  ) {}

  private async incrementUsersWatched(contentMediaId: number): Promise<void> {
    await this.prisma.contentStats.upsert({
      where: { contentMediaId },
      create: { contentMediaId, usersWatched: 1 },
      update: { usersWatched: { increment: 1 } },
    });
  }

  /**
   * Call when the client reports the video finished: bumps watch stats, generates questions (Gemini or fallback), stores survey.
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
    });
    if (!video) {
      throw new NotFoundException(`ContentVideo ${contentVideoId} not found`);
    }

    await this.incrementUsersWatched(video.contentId);

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
