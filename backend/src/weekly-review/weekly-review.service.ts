import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { webVttToPlainText } from "src/contents/webvtt-to-plain-text.util";
import {
  createGradingToken,
  parseGradingToken,
  GRADING_TOKEN_TTL_MS,
  scoreMcqBuckets,
  totalCorrectAndQuestions,
  type GradingItem,
} from "src/content-video/content-video-test-grade.util";
import type { ComprehensionTestItem } from "src/content-video/content-video-comprehension-tests-gemini.client";
import {
  effectiveLearningGoal,
  effectiveTimeHorizon,
} from "src/content-video/studying-plan.util";
import {
  formatUtcWeekStartDate,
  getUtcMondayWeekRange,
} from "src/datetime/utc-monday-week.util";
import { PrismaService } from "src/prisma.service";
import {
  fallbackWeeklyReviewTests,
  isWeeklyMcq,
  normalizeWeeklyReviewTests,
  WeeklyReviewGeminiClient,
  type WeeklyReviewGeminiInput,
} from "./weekly-review-gemini.client";

const MAX_LESSONS_IN_PACK = 12;
const COMBINED_TRANSCRIPT_CAP = 22_000;
const WEEKLY_REVIEW_XP_PER_CORRECT_ANSWER = 10;

export type WeeklyReviewDashboardSummary = {
  weekStart: string;
  lessonCount: number;
  lessonTitles: string[];
  eligible: boolean;
  completedThisWeek: boolean;
  lastScorePct: number | null;
};

export type WeeklyReviewGenerateResult = WeeklyReviewDashboardSummary & {
  tests?: ComprehensionTestItem[];
  gradingToken?: string;
  source?: "gemini" | "fallback";
  learnerCefr?: string | null;
  blockedReason?: "already_completed" | "no_activity" | "suspended";
  message?: string;
  /** Generation was a repeatable practice rerun (not the scored weekly recap). */
  practiceReplay?: boolean;
};

@Injectable()
export class WeeklyReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gemini: WeeklyReviewGeminiClient,
  ) {}

  /**
   * Compact summary for `GET /auth/profile/learning-stats` and the review page.
   */
  async getDashboardSummary(userId: number): Promise<WeeklyReviewDashboardSummary> {
    const { weekStart, weekEndExclusive } = getUtcMondayWeekRange();
    const weekStartStr = formatUtcWeekStartDate(weekStart);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuspended: true,
        weeklyReviewCompletedWeekStart: true,
        weeklyReviewLastScorePct: true,
      },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.isSuspended) {
      return {
        weekStart: weekStartStr,
        lessonCount: 0,
        lessonTitles: [],
        eligible: false,
        completedThisWeek: false,
        lastScorePct: null,
      };
    }
    const { lessonTitles, lessonCount } = await this.loadWeekDistinctLessons(
      userId,
      weekStart,
      weekEndExclusive,
    );
    const completedThisWeek =
      user.weeklyReviewCompletedWeekStart === weekStartStr;
    const eligible = lessonCount > 0 && !completedThisWeek;
    const lastRaw = user.weeklyReviewLastScorePct;
    const lastScorePct =
      typeof lastRaw === "number" && Number.isFinite(lastRaw) ?
        Math.round(lastRaw * 10) / 10
      : null;
    return {
      weekStart: weekStartStr,
      lessonCount,
      lessonTitles,
      eligible,
      completedThisWeek,
      lastScorePct,
    };
  }

  /**
   * Issues a signed MCQ-only weekly review, or explains why it cannot be generated.
   */
  async generateTests(
    userId: number,
    options?: { practiceReplay?: boolean },
  ): Promise<WeeklyReviewGenerateResult> {
    const practiceReplay = options?.practiceReplay === true;
    const base = await this.getDashboardSummary(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuspended: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.isSuspended) {
      return {
        ...base,
        blockedReason: "suspended",
        message: "Account suspended.",
      };
    }
    if (!practiceReplay && base.completedThisWeek) {
      return {
        ...base,
        blockedReason: "already_completed",
        message:
          "You already completed this week’s review. Next one unlocks next Monday (UTC).",
      };
    }
    if (base.lessonCount === 0) {
      return {
        ...base,
        blockedReason: "no_activity",
        message:
          "Watch at least one lesson this week to unlock the weekly review.",
      };
    }
    const { weekStart, weekEndExclusive } = getUtcMondayWeekRange();
    const weekStartStr = formatUtcWeekStartDate(weekStart);
    const videoIds = await this.loadWeekVideoIds(
      userId,
      weekStart,
      weekEndExclusive,
    );
    const combinedTranscript = await this.buildCombinedTranscript(videoIds);
    const ctx = await this.loadWeeklyLearnerContext(userId);
    const geminiInput: WeeklyReviewGeminiInput = {
      lessonTitles: base.lessonTitles,
      combinedTranscript,
      learnerCefr: ctx.cefr,
      vocabularyTerms: ctx.vocabularyTerms,
      learningGoal: ctx.learningGoal,
      timeToAchieve: ctx.timeToAchieve,
      hobbies: ctx.hobbies,
    };
    let tests = await this.gemini.generate(geminiInput);
    let source: "gemini" | "fallback" = "gemini";
    if (!tests?.length) {
      tests = fallbackWeeklyReviewTests(geminiInput);
      source = "fallback";
    }
    tests = normalizeWeeklyReviewTests(tests);
    if (tests.length < 10) {
      tests = normalizeWeeklyReviewTests(fallbackWeeklyReviewTests(geminiInput));
      source = "fallback";
    }
    const items: GradingItem[] = tests.filter(isWeeklyMcq).map((t) => ({
      kind: "mcq" as const,
      id: t.id,
      correctIndex: t.correctIndex,
      category: t.category,
      questionStem: t.question.slice(0, 400),
    }));
    const secret = this.config.getOrThrow<string>("JWT_SECRET");
    const gradingToken = createGradingToken(
      {
        contentVideoId: 0,
        userId,
        exp: Date.now() + GRADING_TOKEN_TTL_MS,
        items,
        quizKind:
          practiceReplay ? "weekly_review_practice" : "weekly_review",
        weeklyReviewWeekStart: weekStartStr,
      },
      secret,
    );
    return {
      ...base,
      tests,
      gradingToken,
      source,
      learnerCefr: ctx.cefr,
      ...(practiceReplay ? { practiceReplay: true as const } : {}),
    };
  }

  async submit(
    userId: number,
    body: { token: string; answers: Record<string, number | string> },
  ): Promise<{
    correct: number;
    total: number;
    percentage: number;
    xpAwarded: number;
    message: string;
  }> {
    const secret = this.config.getOrThrow<string>("JWT_SECRET");
    const p = parseGradingToken((body?.token ?? "").trim(), secret);
    if (
      !p ||
      (p.quizKind !== "weekly_review" &&
        p.quizKind !== "weekly_review_practice")
    ) {
      throw new BadRequestException("Invalid or expired weekly review token");
    }
    if (p.userId !== userId) {
      throw new BadRequestException("Token does not match signed-in user");
    }
    const { weekStart } = getUtcMondayWeekRange();
    const weekStartStr = formatUtcWeekStartDate(weekStart);
    if (p.weeklyReviewWeekStart !== weekStartStr) {
      throw new BadRequestException(
        "This weekly review is from another week — generate a fresh quiz.",
      );
    }
    if (!body?.answers || typeof body.answers !== "object") {
      throw new BadRequestException("Missing answers");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        weeklyReviewCompletedWeekStart: true,
        isSuspended: true,
      },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.isSuspended) {
      throw new ForbiddenException("Account suspended");
    }
    const isPractice = p.quizKind === "weekly_review_practice";
    if (
      !isPractice &&
      user.weeklyReviewCompletedWeekStart === weekStartStr
    ) {
      throw new BadRequestException(
        "Weekly review already submitted for this week.",
      );
    }
    const numericAnswers: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.answers)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        numericAnswers[k] = Math.floor(v);
      }
    }
    const buckets = scoreMcqBuckets(p.items, numericAnswers);
    const { correct, total } = totalCorrectAndQuestions(buckets);
    const pct = total > 0 ? correct / total : 0;
    const scorePct = Math.round(1000 * pct) / 10;
    const xpAwardedWeekly = correct * WEEKLY_REVIEW_XP_PER_CORRECT_ANSWER;
    if (!isPractice) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          weeklyReviewCompletedWeekStart: weekStartStr,
          weeklyReviewLastScorePct: scorePct,
          xp: { increment: xpAwardedWeekly },
        },
      });
    }
    return {
      correct,
      total,
      percentage: scorePct,
      xpAwarded: isPractice ? 0 : xpAwardedWeekly,
      message: isPractice
        ? "Practice rerun graded — rehearsal only."
        : xpAwardedWeekly > 0
          ? `Weekly review saved — +${xpAwardedWeekly} XP (${WEEKLY_REVIEW_XP_PER_CORRECT_ANSWER} per correct answer).`
          : "Weekly review saved — keep watching this week’s lessons for a stronger recap next round.",
    };
  }

  private async loadWeekDistinctLessons(
    userId: number,
    weekStart: Date,
    weekEndExclusive: Date,
  ): Promise<{ lessonTitles: string[]; lessonCount: number }> {
    const rows = await this.prisma.watchSession.findMany({
      where: {
        userId,
        completed: true,
        endedAt: { gte: weekStart, lt: weekEndExclusive },
      },
      orderBy: { endedAt: "desc" },
      select: {
        contentVideoId: true,
        contentVideo: { select: { videoName: true } },
      },
    });
    const seen = new Set<number>();
    const titles: string[] = [];
    for (const r of rows) {
      if (seen.has(r.contentVideoId)) {
        continue;
      }
      seen.add(r.contentVideoId);
      const n = r.contentVideo.videoName.trim();
      if (n.length > 0) {
        titles.push(n);
      }
    }
    return { lessonTitles: titles.slice(0, 16), lessonCount: seen.size };
  }

  private async loadWeekVideoIds(
    userId: number,
    weekStart: Date,
    weekEndExclusive: Date,
  ): Promise<number[]> {
    const rows = await this.prisma.watchSession.findMany({
      where: {
        userId,
        completed: true,
        endedAt: { gte: weekStart, lt: weekEndExclusive },
      },
      orderBy: { endedAt: "desc" },
      select: { contentVideoId: true },
    });
    const seen = new Set<number>();
    const ids: number[] = [];
    for (const r of rows) {
      if (seen.has(r.contentVideoId)) {
        continue;
      }
      seen.add(r.contentVideoId);
      ids.push(r.contentVideoId);
      if (ids.length >= MAX_LESSONS_IN_PACK) {
        break;
      }
    }
    return ids;
  }

  private async buildCombinedTranscript(videoIds: number[]): Promise<string> {
    const parts: string[] = [];
    let totalLen = 0;
    for (const id of videoIds) {
      if (totalLen >= COMBINED_TRANSCRIPT_CAP) {
        break;
      }
      const v = await this.prisma.contentVideo.findUnique({
        where: { id },
        select: {
          videoName: true,
          videoCaption: { select: { subtitlesFileLink: true } },
        },
      });
      if (!v) {
        continue;
      }
      const plain = await this.fetchTranscriptPlain(
        v.videoCaption?.subtitlesFileLink,
      );
      const header = `\n## ${v.videoName.trim()}\n`;
      const chunk =
        plain?.trim().length ?
          `${header}${plain!.trim()}`
        : `${header}(no transcript for this clip)`;
      if (totalLen + chunk.length > COMBINED_TRANSCRIPT_CAP) {
        parts.push(chunk.slice(0, COMBINED_TRANSCRIPT_CAP - totalLen));
        break;
      }
      parts.push(chunk);
      totalLen += chunk.length;
    }
    return parts.join("\n\n");
  }

  private async fetchTranscriptPlain(
    subtitlesFileLink: string | null | undefined,
  ): Promise<string | null> {
    const url = subtitlesFileLink?.trim();
    if (!url) {
      return null;
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        return null;
      }
      const raw = await res.text();
      const plain = webVttToPlainText(raw);
      if (plain.length < 30) {
        return null;
      }
      return plain.slice(0, 14_000);
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  private async loadWeeklyLearnerContext(userId: number): Promise<{
    cefr: string | null;
    vocabularyTerms: string[];
    learningGoal: string;
    timeToAchieve: string;
    hobbies: string[];
  }> {
    const planDefaults = {
      learningGoal: effectiveLearningGoal(null),
      timeToAchieve: effectiveTimeHorizon(null),
      hobbies: [] as string[],
    };
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        additionalUserData: {
          select: {
            englishLevel: true,
            learningGoal: true,
            timeToAchieve: true,
            hobbies: true,
          },
        },
      },
    });
    if (!user) {
      return { cefr: null, vocabularyTerms: [], ...planDefaults };
    }
    const extra = user.additionalUserData;
    const learningGoal = effectiveLearningGoal(extra?.learningGoal);
    const timeToAchieve = effectiveTimeHorizon(extra?.timeToAchieve);
    const hobbies = Array.isArray(extra?.hobbies)
      ? extra.hobbies
          .map((h) => String(h).trim())
          .filter((h) => h.length > 0)
      : [];
    const cefr = extra?.englishLevel?.trim() ?? null;
    const lang = await this.resolveStudyingLanguageCode(userId);
    const rows = await this.prisma.userVocabulary.findMany({
      where: { userId, language: lang },
      orderBy: { mastery: "desc" },
      take: 50,
      select: { term: true },
    });
    const vocabularyTerms = [
      ...new Set(rows.map((r) => r.term.trim()).filter((t) => t.length > 0)),
    ];
    return {
      cefr,
      vocabularyTerms,
      learningGoal,
      timeToAchieve,
      hobbies,
    };
  }

  private async resolveStudyingLanguageCode(userId: number): Promise<string> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });
    if (settings?.studyingLanguage?.trim()) {
      return settings.studyingLanguage.trim().toLowerCase();
    }
    const first = await this.prisma.userLanguageData.findFirst({
      where: { userId },
      include: { topic: { select: { language: true } } },
      orderBy: { topicId: "asc" },
    });
    if (first?.topic.language?.trim()) {
      return first.topic.language.trim().toLowerCase();
    }
    return "en";
  }
}
