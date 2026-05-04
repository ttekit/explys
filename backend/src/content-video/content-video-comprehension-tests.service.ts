import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@generated/prisma/client";
import { webVttToPlainText } from "src/contents/webvtt-to-plain-text.util";
import { PrismaService } from "src/prisma.service";
import { aggregateSkillScore, clamp } from "src/alcorythm/alcorythm-scoring.util";
import {
  countCorrect,
  createGradingToken,
  knowledgeDeltasFromComprehensionStats,
  parseGradingToken,
  type GradingItem,
} from "./content-video-test-grade.util";
import {
  ContentVideoComprehensionTestsGeminiClient,
  ComprehensionTestItem,
  ComprehensionTestsGenerationContext,
  fallbackComprehensionTests,
  fallbackKeyVocabulary,
  normalizeKeyVocabulary,
  type KeyVocabularyItem,
} from "./content-video-comprehension-tests-gemini.client";
import {
  ContentVideoSummaryRecommendationsGeminiClient,
  fallbackSummaryRecommendations,
} from "./content-video-summary-recommendations-gemini.client";
import type { ComprehensionSummaryRecommendationsBodyDto } from "src/content/content-video/dto/summary-recommendations.dto";

const GRADING_TTL_MS = 2 * 60 * 60 * 1000;

/** Stored on each attempt row; aligns with coarse "passed" KPI in admin dashboards. */
const COMPREHENSION_PASS_SCORE_PCT = 70;

export type GenerateComprehensionTestsResult = {
  contentVideoId: number;
  videoName: string;
  source: "gemini" | "fallback";
  tests: ComprehensionTestItem[];
  /** Same Gemini payload as comprehension tests — grounded in transcript, tuned to level + themes. */
  keyVocabulary: KeyVocabularyItem[];
  /** HMAC token (≈2h) to submit answers without re-running the model. */
  gradingToken: string;
  /** Profile English / CEFR when `userId` was sent and the user exists. */
  learnerCefr: string | null;
  /** Whether WebVTT was fetched and had enough text to ground questions. */
  usedTranscript: boolean;
  /** How many of the user’s saved vocabulary terms (study language) were available. */
  vocabularyTermsUsed: number;
  /** Up to 50 terms from the user’s list used for this test (empty if anonymous / none). */
  vocabularyTerms: string[];
};

export type SubmitComprehensionTestResult = {
  correct: number;
  total: number;
  percentage: number;
  comprehension: { correct: number; total: number };
  grammar: { correct: number; total: number };
  knowledgeTopicsUpdated: number;
  knowledgeUpdates: Array<{
    topicId: number;
    previousScore: number;
    newScore: number;
  }>;
  message: string;
  learnerCefr: string | null;
  /** Saved terms for this user’s study language (may be empty). */
  vocabularyTerms: string[];
};

type ComprehensionTestsCachePayload = {
  source: "gemini" | "fallback";
  tests: ComprehensionTestItem[];
  keyVocabulary?: KeyVocabularyItem[];
};

@Injectable()
export class ContentVideoComprehensionTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gemini: ContentVideoComprehensionTestsGeminiClient,
    private readonly summaryRecommendations: ContentVideoSummaryRecommendationsGeminiClient,
  ) { }

  /**
   * Prefer loading `comprehensionTestsCache`; if the column is missing in DB (P2022), retry without it.
   */
  private async findContentVideoForTests(
    contentVideoId: number,
    args: { include: Prisma.ContentVideoInclude },
  ) {
    try {
      return await this.prisma.contentVideo.findUnique({
        where: { id: contentVideoId },
        ...args,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2022"
      ) {
        return await this.prisma.contentVideo.findUnique({
          where: { id: contentVideoId },
          ...args,
          omit: { comprehensionTestsCache: true },
        });
      }
      throw e;
    }
  }

  /**
   * Returns stored tests when present; otherwise runs generation and persists
   * `comprehensionTestsCache` on the `ContentVideo` row. Always issues a new `gradingToken`.
   */
  async getOrLoadTests(
    contentVideoId: number,
    userId?: number | null,
  ): Promise<GenerateComprehensionTestsResult> {
    return this.loadOrRegenerateTests(contentVideoId, userId ?? null, {
      forceRegenerate: false,
    });
  }

  /**
   * Always runs model/fallback, overwrites `comprehensionTestsCache` (same as the original
   * `generate` used by the iframe before caching existed).
   */
  async generate(
    contentVideoId: number,
    userId?: number | null,
  ): Promise<GenerateComprehensionTestsResult> {
    return this.loadOrRegenerateTests(contentVideoId, userId ?? null, {
      forceRegenerate: true,
    });
  }

  private async loadOrRegenerateTests(
    contentVideoId: number,
    userId: number | null,
    options: { forceRegenerate: boolean },
  ): Promise<GenerateComprehensionTestsResult> {
    const video = await this.findContentVideoForTests(contentVideoId, {
      include: {
        videoCaption: true,
        content: {
          include: {
            stats: { select: { userTags: true } },
          },
        },
      },
    });
    if (!video) {
      throw new NotFoundException(`ContentVideo ${contentVideoId} not found`);
    }

    const transcriptPlain = await this.fetchTranscriptPlain(
      video.videoCaption?.subtitlesFileLink,
    );
    const usedTranscript = Boolean(
      transcriptPlain && transcriptPlain.trim().length >= 40,
    );

    const { cefr, vocabularyTerms, learnerThemeKnowledge } =
      await this.loadLearnerContext(userId);

    const videoThemeTags = [
      ...new Set(
        (
          (
            video as {
              content?: { stats?: { userTags?: string[] } | null } | null;
            }
          ).content?.stats?.userTags ??
          ([] as string[])
        )
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      ),
    ];

    const fromCache = !options.forceRegenerate
      ? this.parseComprehensionTestsCache(
        (video as { comprehensionTestsCache?: unknown })
          .comprehensionTestsCache,
      )
      : null;

    if (fromCache?.tests?.length) {
      const keyVocabulary =
        fromCache.keyVocabulary != null &&
        Array.isArray(fromCache.keyVocabulary) &&
        fromCache.keyVocabulary.length >= 6
          ? fromCache.keyVocabulary
          : fallbackKeyVocabulary({
              transcriptPlain,
              videoName: video.videoName,
              learnerCefr: cefr,
              vocabularyTerms,
            });
      return this.assembleResult({
        contentVideoId,
        videoName: video.videoName,
        source: fromCache.source,
        tests: fromCache.tests,
        keyVocabulary,
        usedTranscript,
        cefr,
        vocabularyTerms,
        userId,
      });
    }

    const { source, tests, keyVocabulary } = await this.buildFreshTests(
      video.videoName,
      video.videoDescription,
      transcriptPlain,
      cefr,
      vocabularyTerms,
      videoThemeTags,
      learnerThemeKnowledge,
    );

    try {
      await this.prisma.contentVideo.update({
        where: { id: contentVideoId },
        data: {
          comprehensionTestsCache: {
            source,
            tests,
            keyVocabulary,
          } satisfies ComprehensionTestsCachePayload,
        },
      });
    } catch (e) {
      if (
        !(
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2022"
        )
      ) {
        throw e;
      }
    }

    return this.assembleResult({
      contentVideoId,
      videoName: video.videoName,
      source,
      tests,
      keyVocabulary,
      usedTranscript,
      cefr,
      vocabularyTerms,
      userId,
    });
  }

  async getSummaryRecommendations(
    contentVideoId: number,
    body: ComprehensionSummaryRecommendationsBodyDto,
  ) {
    const v = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
      select: { id: true, videoName: true },
    });
    if (!v) {
      throw new NotFoundException(`ContentVideo ${contentVideoId} not found`);
    }
    const input = {
      videoName: (body.videoName || v.videoName).trim() || v.videoName,
      learnerCefr: body.learnerCefr ?? null,
      vocabularyTerms: Array.isArray(body.vocabularyTerms) ? body.vocabularyTerms : [],
      correct: body.correct,
      total: body.total,
      percentage: body.percentage,
      comprehension: body.comprehension,
      grammar: body.grammar,
    };
    const fromGemini = await this.summaryRecommendations.generate(input);
    return fromGemini ?? fallbackSummaryRecommendations(input);
  }

  private parseComprehensionTestsCache(
    raw: unknown,
  ): ComprehensionTestsCachePayload | null {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const o = raw as Record<string, unknown>;
    const source = o.source;
    if (source !== "gemini" && source !== "fallback") {
      return null;
    }
    if (!Array.isArray(o.tests) || o.tests.length === 0) {
      return null;
    }
    const tests: ComprehensionTestItem[] = [];
    for (const item of o.tests) {
      if (item == null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const t = item as Record<string, unknown>;
      if (typeof t.id !== "string" || !t.id) return null;
      if (typeof t.question !== "string") return null;
      if (!Array.isArray(t.options) || t.options.length < 2) return null;
      for (const opt of t.options) {
        if (typeof opt !== "string") return null;
      }
      const correctIndex = t.correctIndex;
      if (
        typeof correctIndex !== "number" ||
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= t.options.length
      ) {
        return null;
      }
      if (t.category !== "comprehension" && t.category !== "grammar") {
        return null;
      }
      tests.push({
        id: t.id,
        question: t.question,
        options: t.options as string[],
        correctIndex,
        category: t.category,
      });
    }
    let keyVocabulary: KeyVocabularyItem[] | undefined;
    if (Array.isArray(o.keyVocabulary)) {
      const nv = normalizeKeyVocabulary(o.keyVocabulary);
      if (nv.length >= 6) {
        keyVocabulary = nv;
      }
    }
    return { source, tests, keyVocabulary };
  }

  private async buildFreshTests(
    videoName: string,
    videoDescription: string | null,
    transcriptPlain: string | null,
    cefr: string | null,
    vocabularyTerms: string[],
    videoThemeTags: string[],
    learnerThemeKnowledge: string[],
  ): Promise<{
    source: "gemini" | "fallback";
    tests: ComprehensionTestItem[];
    keyVocabulary: KeyVocabularyItem[];
  }> {
    const ctx: ComprehensionTestsGenerationContext = {
      videoName,
      videoDescription,
      transcriptPlain,
      learnerCefr: cefr,
      vocabularyTerms,
      videoThemeTags,
      learnerThemeKnowledge,
    };
    const geminiBundle = await this.gemini.generateTests(ctx);
    if (geminiBundle?.tests.length) {
      return {
        source: "gemini",
        tests: geminiBundle.tests,
        keyVocabulary: geminiBundle.keyVocabulary,
      };
    }
    return {
      source: "fallback",
      tests: fallbackComprehensionTests({
        videoName,
        transcriptPlain,
        learnerCefr: cefr,
        vocabularyTerms,
      }),
      keyVocabulary: fallbackKeyVocabulary({
        transcriptPlain,
        videoName,
        learnerCefr: cefr,
        vocabularyTerms,
      }),
    };
  }

  private assembleResult(p: {
    contentVideoId: number;
    videoName: string;
    source: "gemini" | "fallback";
    tests: ComprehensionTestItem[];
    keyVocabulary: KeyVocabularyItem[];
    usedTranscript: boolean;
    cefr: string | null;
    vocabularyTerms: string[];
    userId: number | null;
  }): GenerateComprehensionTestsResult {
    const secret = this.config.getOrThrow<string>("JWT_SECRET");
    const exp = Date.now() + GRADING_TTL_MS;
    const items: GradingItem[] = p.tests.map((t) => ({
      id: t.id,
      correctIndex: t.correctIndex,
      category: t.category,
    }));
    const gradingToken = createGradingToken(
      { contentVideoId: p.contentVideoId, userId: p.userId, exp, items },
      secret,
    );
    return {
      contentVideoId: p.contentVideoId,
      videoName: p.videoName,
      source: p.source,
      tests: p.tests,
      keyVocabulary: p.keyVocabulary,
      gradingToken,
      learnerCefr: p.cefr,
      usedTranscript: p.usedTranscript,
      vocabularyTermsUsed: p.vocabularyTerms.length,
      vocabularyTerms: p.vocabularyTerms.slice(0, 50),
    };
  }

  /**
   * Grades a submitted attempt, updates `UserLanguageData` for topics linked to this
   * video’s `ContentStats` when the signed token includes a `userId`.
   */
  async submit(
    contentVideoId: number,
    body: { token: string; answers: Record<string, number> },
  ): Promise<SubmitComprehensionTestResult> {
    const secret = this.config.getOrThrow<string>("JWT_SECRET");
    const p = parseGradingToken((body?.token ?? "").trim(), secret);
    if (!p || p.contentVideoId !== contentVideoId) {
      throw new BadRequestException("Invalid or expired test token");
    }
    if (!body?.answers || typeof body.answers !== "object") {
      throw new BadRequestException("Missing answers");
    }
    const stats = countCorrect(p.items, body.answers);
    const total = stats.total;
    const correct = stats.correct;
    const pct = total > 0 ? correct / total : 0;
    const deltas = knowledgeDeltasFromComprehensionStats(stats);
    const { cefr, vocabularyTerms: vocabSubmit } = await this.loadLearnerContext(
      p.userId,
    );
    const knowledgeUpdates: SubmitComprehensionTestResult["knowledgeUpdates"] =
      [];
    if (p.userId == null) {
      return {
        correct,
        total,
        percentage: Math.round(1000 * pct) / 10,
        comprehension: {
          correct: stats.comprehension.c,
          total: stats.comprehension.t,
        },
        grammar: { correct: stats.grammar.c, total: stats.grammar.t },
        knowledgeTopicsUpdated: 0,
        knowledgeUpdates: [],
        message:
          "Add ?userId=YOUR_ID to the iframe URL and reload so your topic scores can be updated.",
        learnerCefr: cefr,
        vocabularyTerms: vocabSubmit,
      };
    }
    const video = await this.findContentVideoForTests(contentVideoId, {
      include: {
        content: {
          include: {
            stats: {
              include: { topics: { select: { id: true } } },
            },
          },
        },
      },
    });
    if (!video) {
      throw new NotFoundException(`ContentVideo ${contentVideoId} not found`);
    }
    const contentWithStats = video as {
      content?: {
        stats?: { topics: { id: number }[] } | null;
      } | null;
    };
    const topicIds =
      contentWithStats.content?.stats?.topics.map((t) => t.id) ?? [];
    if (topicIds.length === 0) {
      await this.persistComprehensionAttempt(
        p.userId,
        contentVideoId,
        correct,
        total,
        pct,
        stats,
      );
      return {
        correct,
        total,
        percentage: Math.round(1000 * pct) / 10,
        comprehension: {
          correct: stats.comprehension.c,
          total: stats.comprehension.t,
        },
        grammar: { correct: stats.grammar.c, total: stats.grammar.t },
        knowledgeTopicsUpdated: 0,
        knowledgeUpdates: [],
        message:
          "This video is not linked to any topics yet, so per-topic knowledge was not updated.",
        learnerCefr: cefr,
        vocabularyTerms: vocabSubmit,
      };
    }
    for (const topicId of topicIds) {
      const row = await this.prisma.userLanguageData.findUnique({
        where: { userId_topicId: { userId: p.userId, topicId } },
      });
      const base = row?.score ?? 0.35;
      const prevListening = row?.listeningScore ?? base;
      const prevVocabulary = row?.vocabularyScore ?? base;
      const prevGrammar = row?.grammarScore ?? base;
      const newListening = clamp(prevListening + deltas.listening);
      const newVocabulary = clamp(prevVocabulary + deltas.vocabulary);
      const newGrammar = clamp(prevGrammar + deltas.grammar);
      const newScore = aggregateSkillScore(
        newListening,
        newVocabulary,
        newGrammar,
      );
      const previousScore = row?.score ?? base;
      if (row) {
        await this.prisma.userLanguageData.update({
          where: { id: row.id },
          data: {
            listeningScore: newListening,
            vocabularyScore: newVocabulary,
            grammarScore: newGrammar,
            score: newScore,
          },
        });
      } else {
        await this.prisma.userLanguageData.create({
          data: {
            userId: p.userId,
            topicId,
            score: newScore,
            listeningScore: newListening,
            vocabularyScore: newVocabulary,
            grammarScore: newGrammar,
            confidence: 0.2,
            coverage: 0.1,
            algorithmVersion: "v2",
          },
        });
      }
      knowledgeUpdates.push({
        topicId,
        previousScore,
        newScore: Math.round(1000 * newScore) / 1000,
      });
    }

    await this.persistComprehensionAttempt(
      p.userId,
      contentVideoId,
      correct,
      total,
      pct,
      stats,
    );

    return {
      correct,
      total,
      percentage: Math.round(1000 * pct) / 10,
      comprehension: {
        correct: stats.comprehension.c,
        total: stats.comprehension.t,
      },
      grammar: { correct: stats.grammar.c, total: stats.grammar.t },
      knowledgeTopicsUpdated: knowledgeUpdates.length,
      knowledgeUpdates,
      message: `Updated topic knowledge for ${knowledgeUpdates.length} topic(s) linked to this content.`,
      learnerCefr: cefr,
      vocabularyTerms: vocabSubmit,
    };
  }

  private async persistComprehensionAttempt(
    userId: number,
    contentVideoId: number,
    correct: number,
    total: number,
    pct: number,
    stats: ReturnType<typeof countCorrect>,
  ): Promise<void> {
    const scorePct = Math.round(1000 * pct) / 10;
    const passed = total > 0 && scorePct >= COMPREHENSION_PASS_SCORE_PCT;
    await this.prisma.comprehensionTestAttempt.create({
      data: {
        userId,
        contentVideoId,
        correct,
        total,
        scorePct,
        passed,
        details: {
          comprehension: {
            correct: stats.comprehension.c,
            total: stats.comprehension.t,
          },
          grammar: { correct: stats.grammar.c, total: stats.grammar.t },
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async loadLearnerContext(userId: number | null): Promise<{
    cefr: string | null;
    vocabularyTerms: string[];
    learnerThemeKnowledge: string[];
  }> {
    if (userId == null) {
      return {
        cefr: null,
        vocabularyTerms: [],
        learnerThemeKnowledge: [],
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { additionalUserData: { select: { englishLevel: true } } },
    });
    if (!user) {
      return {
        cefr: null,
        vocabularyTerms: [],
        learnerThemeKnowledge: [],
      };
    }

    const cefr = user.additionalUserData?.englishLevel?.trim() ?? null;
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

    const themeRows = await this.prisma.userLanguageData.findMany({
      where: {
        userId,
        OR: [
          { listeningScore: { gte: 0.42 } },
          { vocabularyScore: { gte: 0.42 } },
          { grammarScore: { gte: 0.42 } },
        ],
      },
      orderBy: { score: "desc" },
      take: 22,
      select: { topic: { select: { name: true } } },
    });
    const learnerThemeKnowledge = [
      ...new Set(
        themeRows.map((r) => r.topic.name.trim()).filter((n) => n.length > 0),
      ),
    ];

    return { cefr, vocabularyTerms, learnerThemeKnowledge };
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
}
