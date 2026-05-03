import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaService } from "src/prisma.service";
import { AlcorythmService } from "../alcorythm/alcorythm.service";
import {
  parsePlacementDraft,
  PLACEMENT_DRAFT_VERSION,
} from "./placement-draft.types";
import {
  inferPlacementBandFromProfile,
  placementBandFromScore,
  scoreAgainstDraft,
} from "./placement-level.util";
import type { CompletePlacementDto } from "./dto/complete-placement.dto";
import type { PlacementCompleteResponseDto } from "./dto/placement-complete-response.dto";
import {
  PlacementQuestion,
  PlacementTestPayload,
  ThemesFile,
} from "./placement-test.types";
import { renderPlacementHtml } from "./placement-html.template";

@Injectable()
export class PlacementTestService {
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
    return Math.min(
      maxQ,
      Math.max(minQ, themes?.targetQuestionCount ?? 12),
    );
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
          })),
        },
      },
    });
  }

  /**
   * Finishes placement: scores against the persisted draft if present,
   * writes canonical CEFR code to `additionalUserData.englishLevel`,
   * and refreshes alcorythm topic scores — matching frontend expectations (`/auth/profile`).
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

    let scored = { score: 0, total: 0 };
    let band: ReturnType<typeof placementBandFromScore>;

    if (draft?.questions.length) {
      scored = scoreAgainstDraft(draft.questions, answers);
      band = placementBandFromScore(scored.score, scored.total);
    } else {
      band = { code: "B1", label: "Intermediate" };
    }

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

    const pct =
      scored.total > 0 ? Math.round((scored.score / scored.total) * 100) : 0;

    return {
      ok: true as const,
      englishLevel: band.code,
      cefrLabel: band.label,
      score: scored.score,
      totalQuestions: scored.total,
      percentage: pct,
    };
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
    const fromGemini = await this.geminiGenerate(ctx, themes, target);
    const normalized = this.normalizeQuestions(fromGemini);
    let base: PlacementQuestion[];
    if (normalized.length >= 10) {
      base = normalized;
    } else {
      base = this.normalizeQuestions(this.fallbackQuestions(ctx, themes));
    }
    return this.sliceAndRenumberQuestions(base, target);
  }

  private sliceAndRenumberQuestions(
    questions: PlacementQuestion[],
    target: number,
  ): PlacementQuestion[] {
    const slice = questions.slice(0, target);
    return slice.map((q, idx) => ({ ...q, id: `q${idx + 1}` }));
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
  ): string {
    const xApi = this.config.get<string>("API_TOKEN");
    return renderPlacementHtml(payload, accessToken, xApi);
  }
}
