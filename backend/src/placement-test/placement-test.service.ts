import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaService } from "src/prisma.service";
import {
  aggregateSkillScore,
  clamp,
} from "src/alcorythm/alcorythm-scoring.util";
import { knowledgeDelta } from "src/content-video/content-video-test-grade.util";
import { AlcorythmService } from "../alcorythm/alcorythm.service";
import {
  parsePlacementDraft,
  PLACEMENT_DRAFT_VERSION,
  type PlacementStoredDraftQuestion,
} from "./placement-draft.types";
import {
  confirmedPlacementBandFromDeclaredAndScore,
  inferPlacementBandFromProfile,
  placementBandFromScore,
  scoreAgainstDraft,
  scorePlacementBySkill,
} from "./placement-level.util";
import type { CompletePlacementDto } from "./dto/complete-placement.dto";
import type { PlacementCompleteResponseDto } from "./dto/placement-complete-response.dto";
import { buildPlacementSummary } from "./placement-summary.util";
import {
  PlacementQuestion,
  PlacementTestPayload,
  ThemesFile,
} from "./placement-test.types";
import { renderPlacementHtml } from "./placement-html.template";

@Injectable()
export class PlacementTestService {
  private readonly logger = new Logger(PlacementTestService.name);
  private themes: ThemesFile | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly alcorythm: AlcorythmService,
  ) {
    this.themes = this.loadThemes();
  }

  private loadThemes(): ThemesFile | null {
    const nextToFile = join(__dirname, "data", "themes.json");
    const nestAssetPath = join(
      __dirname,
      "..",
      "..",
      "placement-test",
      "data",
      "themes.json",
    );
    const path = existsSync(nextToFile) ? nextToFile : nestAssetPath;
    try {
      const raw = readFileSync(path, "utf-8");
      return JSON.parse(raw) as ThemesFile;
    } catch {
      return null;
    }
  }

  private getTargetQuestionCount(themes: ThemesFile | null): number {
    const minQ = 10;
    const maxQ = 15;
    const raw = themes?.targetQuestionCount ?? 12;
    const n = typeof raw === "number" ? raw : Number(raw);
    const coerced = Number.isFinite(n) ? Math.round(n) : 12;
    return Math.min(maxQ, Math.max(minQ, coerced));
  }

  /** Safe slice bound: Array.slice(0, NaN) yields [] and breaks the test UI. */
  private normalizeTargetQuestionCount(target: number): number {
    const minQ = 10;
    const maxQ = 15;
    const t = Number.isFinite(target) ? Math.round(target) : minQ;
    return Math.min(maxQ, Math.max(minQ, t));
  }

  getThemesSnapshot(): ThemesFile | null {
    return this.themes;
  }

  async getStatus(userId: number): Promise<{
    hasCompletedPlacement: boolean;
    shouldShowEntryTest: boolean;
  }> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { hasCompletedPlacement: true, role: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const isTeacher = user.role === "teacher";
    return {
      hasCompletedPlacement: user.hasCompletedPlacement,
      shouldShowEntryTest: !isTeacher && !user.hasCompletedPlacement,
    };
  }

  async buildTestPayloadForUser(userId: number): Promise<PlacementTestPayload> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        additionalUserData: {
          select: {
            nativeLanguage: true,
            englishLevel: true,
            education: true,
            workField: true,
            hobbies: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const p = user.additionalUserData;
    const knowledgeTags = this.buildKnowledgeTags(p);
    const cefrHint = p?.englishLevel?.trim() || "unknown (treat as mixed B1–B2)";
    const target = this.getTargetQuestionCount(this.themes);

    const questions = await this.buildFinalQuestions(
      { name: user.name, cefrHint, knowledgeTags },
      this.themes,
      target,
    );

    const payload: PlacementTestPayload = {
      title: "English entry placement test",
      knowledgeTags,
      cefrHint,
      questions,
    };

    await this.persistPlacementDraft(userId, questions);
    return payload;
  }

  private async persistPlacementDraft(
    userId: number,
    questions: PlacementQuestion[],
  ): Promise<void> {
    await (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        placementTestDraft: {
          v: PLACEMENT_DRAFT_VERSION,
          issuedAt: new Date().toISOString(),
          questions: questions.map((q) => ({
            id: q.id,
            correctIndex: q.correctIndex,
            type: q.type,
            promptShort: q.prompt.replace(/\s+/g, " ").trim().slice(0, 220),
            answerText: q.options[q.correctIndex].replace(/\s+/g, " ").trim().slice(0, 220),
          })),
        },
      },
    });
  }

  /**
   * Finishes placement: scores vs persisted draft, then assigns `englishLevel` by **confirming**
   * the learner’s pre-test declared band — raw scores never promote above it and cannot pull more than **one**
   * CEFR step below it (questions are generated against their declared level). Refreshes Alcorythm topic scores.
   */
  async completePlacement(
    userId: number,
    body: CompletePlacementDto,
  ): Promise<PlacementCompleteResponseDto> {
    const answers = this.coerceAnswers(body.answers);

    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        hasCompletedPlacement: true,
        placementTestDraft: true,
        additionalUserData: { select: { id: true, englishLevel: true } },
      },
    }) as {
      hasCompletedPlacement: boolean;
      placementTestDraft: unknown;
      additionalUserData: { id: number; englishLevel: string | null } | null;
    } | null;

    if (!user) throw new NotFoundException("User not found");

    if (user.hasCompletedPlacement) {
      const band = inferPlacementBandFromProfile(
        user.additionalUserData?.englishLevel,
      );
      return {
        ok: true as const,
        englishLevel: band.code,
        cefrLabel: band.label,
      };
    }

    const draft = parsePlacementDraft(user.placementTestDraft);

    const declaredBand = inferPlacementBandFromProfile(
      user.additionalUserData?.englishLevel,
    );

    let scored = { score: 0, total: 0 };
    let scoredBand: ReturnType<typeof placementBandFromScore>;

    if (draft?.questions.length) {
      scored = scoreAgainstDraft(draft.questions, answers);
      scoredBand = placementBandFromScore(scored.score, scored.total);
    } else {
      scoredBand = { code: "B1", label: "Intermediate" };
    }

    const band = confirmedPlacementBandFromDeclaredAndScore(
      scoredBand,
      declaredBand,
    );

    await (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        hasCompletedPlacement: true,
        placementTestDraft: null,
      },
    });

    if (user.additionalUserData) {
      await (this.prisma as any).additionalUserData.update({
        where: { id: user.additionalUserData.id },
        data: { englishLevel: band.code },
      });
    }

    await this.alcorythm
      .analyzeUserLevel(userId)
      .catch(() => undefined);

    if (draft?.questions.length) {
      await this.applyPlacementSkillNudge(userId, draft.questions, answers).catch(
        () => undefined,
      );
    }

    const scorePct =
      scored.total > 0
        ? Math.round((1000 * scored.score) / scored.total) / 10
        : 0;
    await this.prisma.placementAttempt.create({
      data: {
        userId,
        scoreCorrect: scored.score,
        scoreTotal: scored.total,
        scorePct,
        englishLevel: band.code,
      },
    });

    const pct =
      scored.total > 0 ? Math.round((scored.score / scored.total) * 100) : 0;

    const summary =
      draft?.questions.length && Object.keys(answers).length
        ? buildPlacementSummary(draft.questions, answers)
        : undefined;

    return {
      ok: true as const,
      englishLevel: band.code,
      cefrLabel: band.label,
      score: scored.score,
      totalQuestions: scored.total,
      percentage: pct,
      summary,
    };
  }

  /** Light touch on skill columns from typed placement items (+ legacy untyped). */
  private async applyPlacementSkillNudge(
    userId: number,
    draftQuestions: readonly PlacementStoredDraftQuestion[],
    answers: Record<string, number>,
  ): Promise<void> {
    const skill = scorePlacementBySkill(draftQuestions, answers);
    const rows = await this.prisma.userLanguageData.findMany({
      where: { userId },
    });
    if (!rows.length) {
      return;
    }

    const anyTyped = skill.grammar.t > 0 || skill.vocabulary.t > 0;
    const scale = 0.2;
    let dL = 0;
    let dV = 0;
    let dG = 0;

    if (skill.grammar.t > 0) {
      dG += knowledgeDelta(skill.grammar.c / skill.grammar.t) * scale;
    }
    if (skill.vocabulary.t > 0) {
      dV += knowledgeDelta(skill.vocabulary.c / skill.vocabulary.t) * scale;
    }
    if (skill.untyped.t > 0) {
      const uPct = skill.untyped.c / skill.untyped.t;
      const d =
        knowledgeDelta(uPct) * scale * (anyTyped ? 0.45 : 0.85);
      dL += d * 0.45;
      dV += d * 0.35;
      dG += d * 0.2;
    }

    for (const row of rows) {
      const nl = clamp(row.listeningScore + dL);
      const nv = clamp(row.vocabularyScore + dV);
      const ng = clamp(row.grammarScore + dG);
      await this.prisma.userLanguageData.update({
        where: { id: row.id },
        data: {
          listeningScore: nl,
          vocabularyScore: nv,
          grammarScore: ng,
          score: aggregateSkillScore(nl, nv, ng),
        },
      });
    }
  }

  private coerceAnswers(raw: CompletePlacementDto["answers"]): Record<
    string,
    number
  > {
    const out: Record<string, number> = {};
    if (!raw || typeof raw !== "object") return out;
    for (const [k, v] of Object.entries(raw)) {
      const n =
        typeof v === "number" && Number.isFinite(v)
          ? v
          : parseInt(String(v), 10);
      if (!Number.isFinite(n) || n < 0 || n > 3 || !`${k}`.trim()) continue;
      out[String(k)] = Math.trunc(n) as number;
    }
    return out;
  }

  private buildKnowledgeTags(
    p: {
      education: string | null;
      workField: string | null;
      hobbies: string[];
    } | null,
  ): string[] {
    const tags: string[] = [];
    if (p?.workField?.trim()) {
      tags.push(`work:${p.workField.trim()}`);
    }
    if (p?.education?.trim()) {
      tags.push(`education:${p.education.trim()}`);
    }
    for (const h of p?.hobbies ?? []) {
      const t = h?.trim();
      if (t) {
        tags.push(`hobby:${t}`);
      }
    }
    if (tags.length === 0) {
      return ["general English learner (no extra profile context)"];
    }
    return tags;
  }

  private async buildFinalQuestions(
    ctx: {
      name: string;
      cefrHint: string;
      knowledgeTags: string[];
    },
    themes: ThemesFile | null,
    target: number,
  ): Promise<PlacementQuestion[]> {
    const safeTarget = this.normalizeTargetQuestionCount(target);
    const fromGemini = await this.geminiGenerate(ctx, themes, safeTarget);
    const normalized = this.normalizeQuestions(fromGemini);
    let base: PlacementQuestion[];
    if (normalized.length >= 10) {
      base = normalized;
    } else {
      base = this.normalizeQuestions(this.fallbackQuestions(ctx, themes));
    }
    let out = this.sliceAndRenumberQuestions(base, safeTarget);
    if (out.length === 0) {
      this.logger.warn(
        "placement: empty bank after primary build; retrying canned fallback",
      );
      base = this.normalizeQuestions(this.fallbackQuestions(ctx, themes));
      out = this.sliceAndRenumberQuestions(base, safeTarget);
    }
    if (out.length === 0) {
      this.logger.error(
        "placement: fallback produced no items — using inline emergency set",
      );
      out = this.emergencyPlacementQuestionSet(safeTarget);
    }
    return out;
  }

  private sliceAndRenumberQuestions(
    questions: PlacementQuestion[],
    target: number,
  ): PlacementQuestion[] {
    const safe = this.normalizeTargetQuestionCount(target);
    const slice = questions.slice(0, safe);
    return slice.map((q, idx) => ({ ...q, id: `q${idx + 1}` }));
  }

  /** Last resort so the iframe never receives questions: []. */
  private emergencyPlacementQuestionSet(target: number): PlacementQuestion[] {
    const safe = this.normalizeTargetQuestionCount(target);
    const bank: PlacementQuestion[] = [
      {
        id: "e1",
        type: "grammar",
        themeId: "daily_life",
        prompt:
          "Choose the best completion: I have been studying English ____ three years.",
        options: ["since", "for", "from", "during"],
        correctIndex: 1,
      },
      {
        id: "e2",
        type: "grammar",
        themeId: "workplace",
        prompt:
          "Choose the best phrase: The report ____ by Friday afternoon.",
        options: [
          "must be finished",
          "must finished",
          "must finishing",
          "must be finishing",
        ],
        correctIndex: 0,
      },
      {
        id: "e3",
        type: "vocabulary",
        themeId: "education",
        prompt: "Closest meaning to postpone:",
        options: ["cancel forever", "put off until later", "speed up", "delete"],
        correctIndex: 1,
      },
      {
        id: "e4",
        type: "vocabulary",
        themeId: "travel",
        prompt: "Best word: Our flight was ____ because of heavy fog.",
        options: ["delayed", "postponed", "advanced", "cancelled"],
        correctIndex: 0,
      },
      {
        id: "e5",
        type: "grammar",
        themeId: "hobbies",
        prompt: "Sheʼs keen ____ improving her pronunciation.",
        options: ["of", "on", "for", "by"],
        correctIndex: 1,
      },
      {
        id: "e6",
        type: "grammar",
        themeId: "daily_life",
        prompt: "If I ____ the earlier train, I would have arrived on time.",
        options: ["took", "had taken", "have taken", "will take"],
        correctIndex: 1,
      },
      {
        id: "e7",
        type: "vocabulary",
        themeId: "workplace",
        prompt: "Polite critique: “I think the memo could read ____”.",
        options: ["more stronger", "stronger a bit", "a bit clearer", "more clearer"],
        correctIndex: 2,
      },
      {
        id: "e8",
        type: "grammar",
        themeId: "education",
        prompt: "Choose the best completion: By next month I ____ the prerequisites.",
        options: [
          "will have completed",
          "complete",
          "have been completing",
          "completed",
        ],
        correctIndex: 0,
      },
      {
        id: "e9",
        type: "vocabulary",
        themeId: "daily_life",
        prompt: "“Reliable” in a gadget review implies:",
        options: [
          "trend-hopping",
          "likely to glitch",
          "consistently trustworthy",
          "ultra pricey",
        ],
        correctIndex: 2,
      },
      {
        id: "e10",
        type: "grammar",
        themeId: "workplace",
        prompt: "____ setbacks, release stayed on schedule.",
        options: ["Although", "However", "Despite", "Because"],
        correctIndex: 2,
      },
      {
        id: "e11",
        type: "vocabulary",
        themeId: "education",
        prompt: "Best collocation: We need to make ____ before leaving.",
        options: ["arrangements", "a homework", "many fun", "a damage"],
        correctIndex: 0,
      },
      {
        id: "e12",
        type: "grammar",
        themeId: "travel",
        prompt: "Select the sentence with correct article use.",
        options: [
          "I led an important the meeting",
          "I led an important meeting",
          "I led important a meeting",
          "I led the important an meeting",
        ],
        correctIndex: 1,
      },
      {
        id: "e13",
        type: "vocabulary",
        themeId: "hobbies",
        prompt: "In casual English, “to pull off” most often means:",
        options: [
          "to cancel abruptly",
          "to achieve something tricky successfully",
          "to escalate an argument",
          "to stop trying",
        ],
        correctIndex: 1,
      },
      {
        id: "e14",
        type: "grammar",
        themeId: "workplace",
        prompt: "The director, ____ team shipped early, thanked everyone.",
        options: ["which", "whose", "whom", "where"],
        correctIndex: 1,
      },
      {
        id: "e15",
        type: "vocabulary",
        themeId: "education",
        prompt: "Best word: The lecture felt so ____ that half the class drifted.",
        options: ["fascinated", "tedious", "tediously", "bored"],
        correctIndex: 1,
      },
    ];
    const normalized = this.normalizeQuestions(bank);
    const slice = normalized.length ? normalized : bank;
    return this.sliceAndRenumberQuestions(slice, safe);
  }

  private async geminiGenerate(
    ctx: { name: string; cefrHint: string; knowledgeTags: string[] },
    themes: ThemesFile | null,
    target: number,
  ): Promise<PlacementQuestion[]> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      return [];
    }
    const model =
      this.config.get<string>("GEMINI_MODEL") || "gemini-2.0-flash";
    const apiUrl =
      this.config.get<string>("GEMINI_API_URL") ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const themeSummary = themes
      ? JSON.stringify(
          {
            themes: themes.themes.map((t) => ({
              id: t.id,
              label: t.label,
              sampleVocabulary: t.vocabulary.slice(0, 6),
              scenarios: (t.scenarios ?? []).slice(0, 3),
            })),
            grammarFoci: themes.grammarFoci.map((g) => g.id + ": " + g.label),
            vocabularyFoci: themes.vocabularyFoci,
          },
          null,
          0,
        )
      : "[]";

    const grammarCount = Math.ceil(target * 0.5);
    const vocabCount = target - grammarCount;

    const prompt = [
      "You craft a timed multistep placement test rendered in an SPA iframe (one screen per item; options are touch targets). Learner:",
      `- Display name hint (do not repeat verbatim personal data): ${ctx.name}`,
      "Output ONLY a JSON object — no prose, fences, BOM, markdown. Shape:",
      '{"questions":[{"id":"qTEMP","type":"grammar","themeId":"workplace","prompt":"…","options":["…","…","…","…"],"correctIndex":0}]}',
      "Hard rules:",
      `- Exactly ${target} questions.`,
      `- Type counts: ${grammarCount} "grammar", ${vocabCount} "vocabulary" (spell exactly).`,
      "- Each prompt is one clear standalone item (sentence completion, cloze gap, synonym, collocation, error correction scenario). Prompt must not reveal the letter of the answer.",
      "- Four options exactly; each ≤ 120 chars; natural English; duplicates forbidden.",
      '- Do NOT prefix options with letters, numbers like "A." or bullets — plain answer text only.',
      "- Exactly one objectively correct answer; correctIndex 0..3 references options array.",
      '- themeId optional string from catalogue snapshot; fallback "daily_life".',
      "- ids temporarily any short string — server will canonicalize.",
      `- Calibrate roughly to CEFR prior: ${ctx.cefrHint}.`,
      `- Theme knowledge tags for tone (generic scenarios only): ${ctx.knowledgeTags.join("; ")}`,
      `Theme catalogue (JSON): ${themeSummary}`,
    ].join("\n");

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
          },
        }),
      });
      if (!res.ok) {
        return [];
      }
      const payload = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string") {
        return [];
      }
      const parsed = JSON.parse(text) as { questions?: PlacementQuestion[] };
      if (!parsed?.questions?.length) {
        return [];
      }
      return parsed.questions;
    } catch {
      return [];
    }
  }

  private sanitizeOptionLine(s: unknown): string | null {
    let t = String(s ?? "").trim();
    if (!t) return null;
    t = t
      .replace(/^\s*[\[{]\s*[A-Za-z0-9"' ]{0,48}\s*[\]}]\s*/u, "")
      .replace(/^\s*[A-Da-d][\).\s:_-]+\s+/u, "")
      .replace(/^\s*\([A-Da-d]\)\s*/u, "")
      .replace(/\s+/g, " ")
      .trim();
    return t.length > 0 ? t.slice(0, 500) : null;
  }

  private normalizeQuestions(raw: PlacementQuestion[]): PlacementQuestion[] {
    const out: PlacementQuestion[] = [];
    for (let i = 0; i < raw.length; i++) {
      const q = raw[i];
      if (!q || !q.prompt || !Array.isArray(q.options) || q.options.length !== 4) {
        continue;
      }
      const o0 = this.sanitizeOptionLine(q.options[0]);
      const o1 = this.sanitizeOptionLine(q.options[1]);
      const o2 = this.sanitizeOptionLine(q.options[2]);
      const o3 = this.sanitizeOptionLine(q.options[3]);
      if (!o0 || !o1 || !o2 || !o3) {
        continue;
      }
      const lower = [o0, o1, o2, o3].map((x) => x.toLowerCase());
      if (new Set(lower).size !== 4) {
        continue;
      }
      const type =
        q.type === "vocabulary" || q.type === "grammar" ? q.type : "grammar";
      const idx = [0, 1, 2, 3].includes(Number(q.correctIndex))
        ? (Number(q.correctIndex) as 0 | 1 | 2 | 3)
        : (0 as 0 | 1 | 2 | 3);

      let themeId: string | undefined;
      if (
        typeof q.themeId === "string" &&
        /^[a-z][a-z0-9_-]{0,40}$/i.test(q.themeId)
      ) {
        themeId = q.themeId;
      }

      out.push({
        id: String(q.id || `temp-${i}`),
        type,
        themeId,
        prompt: String(q.prompt).trim().replace(/\s+/g, " ").slice(0, 2000),
        options: [o0, o1, o2, o3] as [
          string,
          string,
          string,
          string,
        ],
        correctIndex: idx,
      });
    }
    return out;
  }

  private fallbackQuestions(
    ctx: { cefrHint: string; knowledgeTags: string[] },
    themes: ThemesFile | null,
  ): PlacementQuestion[] {
    const themeIds = themes?.themes?.map((t) => t.id) ?? [
      "workplace",
      "education",
      "hobbies",
    ];
    const tagLine = ctx.knowledgeTags[0] ?? "general";
    const mix: PlacementQuestion[] = [
      {
        id: "x1",
        type: "grammar",
        themeId: themeIds[0],
        prompt: `Choose the best completion: By next month I ____ the prerequisites. (${tagLine})`,
        options: [
          "will have completed",
          "complete",
          "have been completing",
          "completed",
        ],
        correctIndex: 0,
      },
      {
        id: "x2",
        type: "grammar",
        themeId: themeIds[1] ?? "daily_life",
        prompt: `Select correct article use.`,
        options: [
          "I led an important the meeting",
          "I led an important meeting",
          "I led important a meeting",
          "I led the important an meeting",
        ],
        correctIndex: 1,
      },
      {
        id: "x3",
        type: "vocabulary",
        themeId: themeIds[2] ?? "hobbies",
        prompt: `In casual English, "to pull off" most often means:`,
        options: [
          "to cancel abruptly",
          "to achieve something tricky successfully",
          "to escalate an argument",
          "to stop trying",
        ],
        correctIndex: 1,
      },
      {
        id: "x4",
        type: "vocabulary",
        themeId: "daily_life",
        prompt: `Choose best collocation: We need to make ____ before leaving.`,
        options: [
          "arrangements",
          "a homework",
          "many fun",
          "a damage",
        ],
        correctIndex: 0,
      },
      {
        id: "x5",
        type: "grammar",
        themeId: "travel",
        prompt: `If I ____ the earlier train, I would have arrived on time.`,
        options: ["took", "had taken", "have taken", "will take"],
        correctIndex: 1,
      },
      {
        id: "x6",
        type: "grammar",
        themeId: "workplace",
        prompt: `The director, ____ team shipped early, thanked everyone.`,
        options: ["which", "whose", "whom", "where"],
        correctIndex: 1,
      },
      {
        id: "x7",
        type: "vocabulary",
        themeId: "education",
        prompt: `Best word: The lecture felt so ____ that half the class drifted.`,
        options: ["fascinated", "tedious", "tediously", "bored"],
        correctIndex: 1,
      },
      {
        id: "x8",
        type: "vocabulary",
        themeId: "workplace",
        prompt: `Polite critique: “I think the memo could read ____”.`,
        options: [
          "more stronger",
          "stronger a bit",
          "a bit clearer",
          "more clearer",
        ],
        correctIndex: 2,
      },
      {
        id: "x9",
        type: "grammar",
        themeId: "hobbies",
        prompt: `Sheʼs keen ____ improving her pronunciation.`,
        options: ["of", "on", "for", "by"],
        correctIndex: 1,
      },
      {
        id: "x10",
        type: "vocabulary",
        themeId: "daily_life",
        prompt: `“Reliable” in a gadget review implies:`,
        options: [
          "trend-hopping",
          "likely to glitch",
          "consistently trustworthy",
          "ultra pricey",
        ],
        correctIndex: 2,
      },
      {
        id: "x11",
        type: "grammar",
        themeId: "workplace",
        prompt: `____ setbacks, release stayed on schedule.`,
        options: [
          "Although",
          "However",
          "Despite",
          "Because",
        ],
        correctIndex: 2,
      },
      {
        id: "x12",
        type: "vocabulary",
        themeId: "education",
        prompt: `Closest meaning to postpone:`,
        options: ["shrink", "permanently delete", "put off later", "speed up"],
        correctIndex: 2,
      },
    ];
    void ctx.cefrHint;
    return mix;
  }

  renderDocumentHtml(
    payload: PlacementTestPayload,
    accessToken: string,
    apiPublicOrigin: string,
  ): string {
    const xApi = this.config.get<string>("API_TOKEN");
    return renderPlacementHtml(payload, accessToken, xApi, apiPublicOrigin);
  }
}
