import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import { webVttToPlainText } from "src/contents/webvtt-to-plain-text.util";
import { PrismaService } from "src/prisma.service";
import { aggregateSkillScore, clamp } from "src/alcorythm/alcorythm-scoring.util";
import {
  applyOpenResult,
  createGradingToken,
  knowledgeDeltasFromSkillBuckets,
  legacyComprehensionGrammarStats,
  parseGradingToken,
  scoreMcqBuckets,
  totalCorrectAndQuestions,
  type GradingItem,
  type ParsedGradingPayload,
  type SkillBucketStats,
} from "./content-video-test-grade.util";
import {
  ContentVideoOpenAnswerGraderClient,
  heuristicOpenSummaryPass,
  offlineOpenSummaryFeedback,
} from "./content-video-open-answer-grader.client";
import {
  ContentVideoComprehensionTestsGeminiClient,
  ComprehensionTestItem,
  ComprehensionTestsGenerationContext,
  type PriorWeakSpot,
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
import { UserVocabularyService } from "src/user-vocabulary/user-vocabulary.service";
import { syncActiveStudyingPhaseForUser } from "src/studying-plan/sync-active-studying-phase";
import {
  effectiveLearningGoal,
  effectiveTimeHorizon,
} from "./studying-plan.util";

const GRADING_TTL_MS = 2 * 60 * 60 * 1000;

/** Stored on each attempt row; aligns with coarse "passed" KPI in admin dashboards. */
const COMPREHENSION_PASS_SCORE_PCT = 70;

const MAX_PRIOR_WEAK_SPOTS = 8;

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
  vocabulary: { correct: number; total: number };
  knowledgeTopicsUpdated: number;
  knowledgeUpdates: Array<{
    topicId: number;
    previousScore: number;
    newScore: number;
  }>;
  message: string;
  learnerCefr: string | null;
  vocabularyTerms: string[];
  /** Coach-style feedback for the written summary (Gemini when configured, else heuristic). */
  openEndedFeedback: string | null;
  /** 1–10 from the model when the open summary was graded; null if offline/heuristic/no open item. */
  writtenSummaryScore: number | null;
};

function weakSpotStemHash(category: string, stemSnippet: string): string {
  const n = stemSnippet.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(`${category}:${n}`).digest("hex");
}

function normalizeSubmitKeyVocabularyTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw.slice(0, 50)) {
    if (typeof x !== "string") continue;
    const t = x.trim().slice(0, 120);
    if (t.length >= 2) out.push(t);
  }
  return out;
}

function normalizeSubmitKeyVocabularyDetails(raw: unknown): Array<{
  term: string;
  nativeTranslation: string | null;
  learnerDescription: string | null;
}> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{
    term: string;
    nativeTranslation: string | null;
    learnerDescription: string | null;
  }> = [];
  for (const x of raw.slice(0, 50)) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.term !== "string") continue;
    const term = o.term.trim().slice(0, 120);
    if (term.length < 2) continue;
    let nativeTranslation: string | null = null;
    if (typeof o.nativeTranslation === "string") {
      const t = o.nativeTranslation.trim().slice(0, 500);
      nativeTranslation = t.length > 0 ? t : null;
    }
    let learnerDescription: string | null = null;
    if (typeof o.learnerDescription === "string") {
      const d = o.learnerDescription.trim().slice(0, 2000);
      learnerDescription = d.length > 0 ? d : null;
    }
    out.push({ term, nativeTranslation, learnerDescription });
  }
  return out;
}

@Injectable()
export class ContentVideoComprehensionTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gemini: ContentVideoComprehensionTestsGeminiClient,
    private readonly summaryRecommendations: ContentVideoSummaryRecommendationsGeminiClient,
    private readonly openAnswerGrader: ContentVideoOpenAnswerGraderClient,
    private readonly userVocabulary: UserVocabularyService,
  ) { }

  /**
   * Always generates fresh tests (no server-side cache). Issues a new `gradingToken` each time.
   */
  async getOrLoadTests(
    contentVideoId: number,
    userId?: number | null,
  ): Promise<GenerateComprehensionTestsResult> {
    return this.loadTests(contentVideoId, userId ?? null);
  }

  /** Same behaviour as `getOrLoadTests` (cache removed). Kept for API compatibility. */
  async generate(
    contentVideoId: number,
    userId?: number | null,
  ): Promise<GenerateComprehensionTestsResult> {
    return this.loadTests(contentVideoId, userId ?? null);
  }

  private async loadTests(
    contentVideoId: number,
    userId: number | null,
  ): Promise<GenerateComprehensionTestsResult> {
    const video = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
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

    const {
      cefr,
      vocabularyTerms,
      learnerThemeKnowledge,
      learningGoal,
      timeToAchieve,
      hobbies,
    } = await this.loadLearnerContext(userId);

    const priorWeakSpots = await this.loadPriorWeakSpots(
      userId,
      contentVideoId,
    );

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

    const { source, tests, keyVocabulary: rawKeyVocab } =
      await this.buildFreshTests(
        video.videoName,
        video.videoDescription,
        transcriptPlain,
        cefr,
        vocabularyTerms,
        videoThemeTags,
        learnerThemeKnowledge,
        priorWeakSpots,
        learningGoal,
        timeToAchieve,
        hobbies,
      );
    let keyVocabulary = rawKeyVocab;
    if (!keyVocabulary.length) {
      keyVocabulary = fallbackKeyVocabulary({
        transcriptPlain,
        videoName: video.videoName,
        videoDescription: video.videoDescription,
        learnerCefr: cefr,
        vocabularyTerms,
        learnerThemeKnowledge,
        videoThemeTags,
        learningGoal,
        timeToAchieve,
        hobbies,
      });
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

  private async buildFreshTests(
    videoName: string,
    videoDescription: string | null,
    transcriptPlain: string | null,
    cefr: string | null,
    vocabularyTerms: string[],
    videoThemeTags: string[],
    learnerThemeKnowledge: string[],
    priorWeakSpots: PriorWeakSpot[],
    learningGoal: string,
    timeToAchieve: string,
    hobbies: string[],
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
      priorWeakSpots,
      learningGoal,
      timeToAchieve,
      hobbies,
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
        priorWeakSpots,
        learningGoal,
        timeToAchieve,
        hobbies,
      }),
      keyVocabulary: fallbackKeyVocabulary({
        transcriptPlain,
        videoName,
        videoDescription,
        learnerCefr: cefr,
        vocabularyTerms,
        learnerThemeKnowledge,
        videoThemeTags,
        learningGoal,
        timeToAchieve,
        hobbies,
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
    const items: GradingItem[] = p.tests.map((t) =>
      t.questionType === "open"
        ? {
            kind: "open" as const,
            id: t.id,
            category: "open" as const,
            questionStem: t.question.slice(0, 400),
          }
        : {
            kind: "mcq" as const,
            id: t.id,
            correctIndex: t.correctIndex,
            category: t.category,
            questionStem: t.question.slice(0, 400),
          },
    );
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
    body: {
      token: string;
      answers: Record<string, number | string>;
      keyVocabularyTerms?: string[];
      keyVocabularyDetails?: unknown;
    },
  ): Promise<SubmitComprehensionTestResult> {
    const secret = this.config.getOrThrow<string>("JWT_SECRET");
    const p = parseGradingToken((body?.token ?? "").trim(), secret);
    if (!p || p.contentVideoId !== contentVideoId) {
      throw new BadRequestException("Invalid or expired test token");
    }
    if (!body?.answers || typeof body.answers !== "object") {
      throw new BadRequestException("Missing answers");
    }

    const rawAnswers = this.normalizeSubmitAnswers(body.answers);
    const numericAnswers: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawAnswers)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        numericAnswers[k] = Math.floor(v);
      }
    }

    let buckets = scoreMcqBuckets(p.items, numericAnswers);
    const openEntry = p.items.find(
      (it): it is Extract<GradingItem, { kind: "open" }> =>
        it.kind === "open",
    );
    let openEndedFeedback: string | null = null;
    let writtenSummaryScore: number | null = null;
    if (openEntry) {
      const text =
        typeof rawAnswers[openEntry.id] === "string"
          ? (rawAnswers[openEntry.id] as string)
          : "";
      const videoMeta = await this.prisma.contentVideo.findUnique({
        where: { id: contentVideoId },
        select: {
          videoName: true,
          videoDescription: true,
          videoCaption: { select: { subtitlesFileLink: true } },
        },
      });
      const transcriptPlain = await this.fetchTranscriptPlain(
        videoMeta?.videoCaption?.subtitlesFileLink,
      );
      const { cefr: cefrForOpen } = await this.loadLearnerContext(p.userId);
      const learnerProfile =
        await this.loadAdditionalProfileForOpenGrading(p.userId);
      const graded = await this.openAnswerGrader.gradeOpenSummary({
        videoName: videoMeta?.videoName ?? "",
        videoDescription: videoMeta?.videoDescription ?? null,
        transcriptPlain,
        learnerAnswer: text,
        learnerCefr: cefrForOpen,
        learnerProfile,
      });
      const openPass =
        graded !== null ? graded.pass : heuristicOpenSummaryPass(text);
      if (graded !== null) {
        writtenSummaryScore = graded.score;
      }
      buckets = applyOpenResult(buckets, openEntry.id, openPass);
      const baseFeedback =
        graded !== null && graded.feedback.trim().length > 0
          ? graded.feedback.trim()
          : offlineOpenSummaryFeedback(openPass);
      openEndedFeedback =
        writtenSummaryScore != null ?
          `Summary score: ${writtenSummaryScore}/10.\n\n${baseFeedback}`
        : baseFeedback;
    }

    const { correct, total } = totalCorrectAndQuestions(buckets);
    const pct = total > 0 ? correct / total : 0;
    const deltas = knowledgeDeltasFromSkillBuckets(buckets);
    const legacy = legacyComprehensionGrammarStats(buckets);

    const { cefr, vocabularyTerms: vocabSubmit } = await this.loadLearnerContext(
      p.userId,
    );

    if (p.userId != null) {
      await this.recordWeakSpotsFromSubmit(
        p.userId,
        contentVideoId,
        p,
        rawAnswers,
        numericAnswers,
        buckets,
      );
      const keyTerms = normalizeSubmitKeyVocabularyTerms(body.keyVocabularyTerms);
      const keyDetails = normalizeSubmitKeyVocabularyDetails(
        body.keyVocabularyDetails,
      );
      if (keyTerms.length > 0) {
        await this.userVocabulary
          .recordKeyTermsFromLesson({
            userId: p.userId,
            contentVideoId,
            terms: keyTerms,
            details: keyDetails.length > 0 ? keyDetails : undefined,
          })
          .catch(() => undefined);
      }
    }

    const knowledgeUpdates: SubmitComprehensionTestResult["knowledgeUpdates"] =
      [];
    if (p.userId == null) {
      return {
        correct,
        total,
        percentage: Math.round(1000 * pct) / 10,
        comprehension: {
          correct: legacy.comprehension.c,
          total: legacy.comprehension.t,
        },
        grammar: { correct: legacy.grammar.c, total: legacy.grammar.t },
        vocabulary: {
          correct: buckets.vocabulary.c,
          total: buckets.vocabulary.t,
        },
        knowledgeTopicsUpdated: 0,
        knowledgeUpdates: [],
        message:
          "Add ?userId=YOUR_ID to the iframe URL and reload so your topic scores can be updated.",
        learnerCefr: cefr,
        vocabularyTerms: vocabSubmit,
        openEndedFeedback,
        writtenSummaryScore,
      };
    }
    const video = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
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
        buckets,
      );
      return {
        correct,
        total,
        percentage: Math.round(1000 * pct) / 10,
        comprehension: {
          correct: legacy.comprehension.c,
          total: legacy.comprehension.t,
        },
        grammar: { correct: legacy.grammar.c, total: legacy.grammar.t },
        vocabulary: {
          correct: buckets.vocabulary.c,
          total: buckets.vocabulary.t,
        },
        knowledgeTopicsUpdated: 0,
        knowledgeUpdates: [],
        message:
          "This video is not linked to any topics yet, so per-topic knowledge was not updated.",
        learnerCefr: cefr,
        vocabularyTerms: vocabSubmit,
        openEndedFeedback,
        writtenSummaryScore,
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
      buckets,
    );

    return {
      correct,
      total,
      percentage: Math.round(1000 * pct) / 10,
      comprehension: {
        correct: legacy.comprehension.c,
        total: legacy.comprehension.t,
      },
      grammar: { correct: legacy.grammar.c, total: legacy.grammar.t },
      vocabulary: {
        correct: buckets.vocabulary.c,
        total: buckets.vocabulary.t,
      },
      knowledgeTopicsUpdated: knowledgeUpdates.length,
      knowledgeUpdates,
      message: `Updated topic knowledge for ${knowledgeUpdates.length} topic(s) linked to this content.`,
      learnerCefr: cefr,
      vocabularyTerms: vocabSubmit,
      openEndedFeedback,
      writtenSummaryScore,
    };
  }

  private normalizeSubmitAnswers(
    raw: Record<string, number | string>,
  ): Record<string, number | string> {
    const out: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        out[k] = Math.floor(v);
      } else if (typeof v === "string") {
        out[k] = v;
      }
    }
    return out;
  }

  private async recordWeakSpotsFromSubmit(
    userId: number,
    contentVideoId: number,
    p: ParsedGradingPayload,
    rawAnswers: Record<string, number | string>,
    numericAnswers: Record<string, number>,
    buckets: SkillBucketStats,
  ): Promise<void> {
    if (p.v !== 2 && p.v !== 3) {
      return;
    }
    for (const it of p.items) {
      const stem = it.questionStem?.trim();
      if (!stem) {
        continue;
      }
      if (it.kind === "open") {
        if (buckets.open.c >= 1) {
          continue;
        }
        const hash = weakSpotStemHash("open", stem);
        await this.prisma.userComprehensionWeakSpot.upsert({
          where: {
            userId_contentVideoId_stemHash: {
              userId,
              contentVideoId,
              stemHash: hash,
            },
          },
          create: {
            userId,
            contentVideoId,
            category: "open",
            stemHash: hash,
            stemSnippet: stem.slice(0, 500),
            missCount: 1,
            lastMissedAt: new Date(),
          },
          update: {
            missCount: { increment: 1 },
            lastMissedAt: new Date(),
            stemSnippet: stem.slice(0, 500),
          },
        });
        continue;
      }
      const picked = numericAnswers[it.id];
      const ok = typeof picked === "number" && picked === it.correctIndex;
      if (ok) {
        continue;
      }
      const hash = weakSpotStemHash(it.category, stem);
      await this.prisma.userComprehensionWeakSpot.upsert({
        where: {
          userId_contentVideoId_stemHash: {
            userId,
            contentVideoId,
            stemHash: hash,
          },
        },
        create: {
          userId,
          contentVideoId,
          category: it.category,
          stemHash: hash,
          stemSnippet: stem.slice(0, 500),
          missCount: 1,
          lastMissedAt: new Date(),
        },
        update: {
          missCount: { increment: 1 },
          lastMissedAt: new Date(),
          stemSnippet: stem.slice(0, 500),
        },
      });
    }
  }

  private async loadPriorWeakSpots(
    userId: number | null,
    contentVideoId: number,
  ): Promise<PriorWeakSpot[]> {
    if (userId == null) {
      return [];
    }
    const rows = await this.prisma.userComprehensionWeakSpot.findMany({
      where: { userId, contentVideoId },
      orderBy: [{ missCount: "desc" }, { lastMissedAt: "desc" }],
      take: MAX_PRIOR_WEAK_SPOTS,
      select: {
        category: true,
        stemSnippet: true,
        missCount: true,
      },
    });
    return rows.map((r) => ({
      category: r.category,
      stemSnippet: r.stemSnippet,
      missCount: r.missCount,
    }));
  }

  private async persistComprehensionAttempt(
    userId: number,
    contentVideoId: number,
    correct: number,
    total: number,
    pct: number,
    buckets: SkillBucketStats,
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
            correct: buckets.comprehension.c,
            total: buckets.comprehension.t,
          },
          vocabulary: {
            correct: buckets.vocabulary.c,
            total: buckets.vocabulary.t,
          },
          grammar: { correct: buckets.grammar.c, total: buckets.grammar.t },
          open: { correct: buckets.open.c, total: buckets.open.t },
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await syncActiveStudyingPhaseForUser(this.prisma, userId);
  }

  private async loadLearnerContext(userId: number | null): Promise<{
    cefr: string | null;
    vocabularyTerms: string[];
    learnerThemeKnowledge: string[];
    learningGoal: string;
    timeToAchieve: string;
    hobbies: string[];
  }> {
    const planDefaults = {
      learningGoal: effectiveLearningGoal(null),
      timeToAchieve: effectiveTimeHorizon(null),
      hobbies: [] as string[],
    };
    if (userId == null) {
      return {
        cefr: null,
        vocabularyTerms: [],
        learnerThemeKnowledge: [],
        ...planDefaults,
      };
    }

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
      return {
        cefr: null,
        vocabularyTerms: [],
        learnerThemeKnowledge: [],
        ...planDefaults,
      };
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

    return {
      cefr,
      vocabularyTerms,
      learnerThemeKnowledge,
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

  /** Job, education, hobbies from `AdditionalUserData` for open-summary coaching. */
  private async loadAdditionalProfileForOpenGrading(userId: number | null): Promise<{
    job: string | null;
    education: string | null;
    hobbies: string[];
  }> {
    if (userId == null) {
      return { job: null, education: null, hobbies: [] };
    }
    const row = await this.prisma.additionalUserData.findUnique({
      where: { userId },
      select: { job: true, education: true, hobbies: true },
    });
    if (!row) {
      return { job: null, education: null, hobbies: [] };
    }
    return {
      job: row.job?.trim() ?? null,
      education: row.education?.trim() ?? null,
      hobbies: Array.isArray(row.hobbies)
        ? row.hobbies.map((h) => h.trim()).filter((h) => h.length > 0)
        : [],
    };
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
