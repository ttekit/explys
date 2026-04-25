import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaService } from "src/prisma.service";
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

  getThemesSnapshot(): ThemesFile | null {
    return this.themes;
  }

  async getStatus(userId: number): Promise<{
    hasCompletedPlacement: boolean;
    shouldShowEntryTest: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hasCompletedPlacement: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return {
      hasCompletedPlacement: user.hasCompletedPlacement,
      shouldShowEntryTest: !user.hasCompletedPlacement,
    };
  }

  async markComplete(userId: number): Promise<{ ok: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hasCompletedPlacement: true },
    });
    return { ok: true };
  }

  async buildTestPayloadForUser(
    userId: number,
  ): Promise<PlacementTestPayload> {
    const user = await this.prisma.user.findUnique({
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

    const questions = await this.generateQuestions(
      { name: user.name, cefrHint, knowledgeTags },
      this.themes,
    );
    return {
      title: "English entry placement test",
      knowledgeTags,
      cefrHint,
      questions,
    };
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

  private async generateQuestions(
    ctx: {
      name: string;
      cefrHint: string;
      knowledgeTags: string[];
    },
    themes: ThemesFile | null,
  ): Promise<PlacementQuestion[]> {
    const fromGemini = await this.geminiGenerate(ctx, themes);
    if (fromGemini.length >= 10) {
      return this.normalizeQuestions(fromGemini);
    }
    return this.fallbackQuestions(ctx, themes);
  }

  private async geminiGenerate(
    ctx: { name: string; cefrHint: string; knowledgeTags: string[] },
    themes: ThemesFile | null,
  ): Promise<PlacementQuestion[]> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      return [];
    }
    const model = this.config.get<string>("GEMINI_MODEL") || "gemini-2.0-flash";
    const apiUrl = this.config.get<string>("GEMINI_API_URL")
      || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const themeSummary = themes
      ? JSON.stringify(
          {
            themes: themes.themes.map((t) => ({
              id: t.id,
              label: t.label,
              sampleVocabulary: t.vocabulary.slice(0, 4),
            })),
            grammarFoci: themes.grammarFoci.map((g) => g.id + ": " + g.label),
            vocabularyFoci: themes.vocabularyFoci,
            targetCount: themes.targetQuestionCount ?? 12,
          },
          null,
          0,
        )
      : "[]";

    const minQ = 10;
    const maxQ = 15;
    const target = Math.min(
      maxQ,
      Math.max(
        minQ,
        themes?.targetQuestionCount ?? 12,
      ),
    );
    const grammarCount = Math.ceil(target * 0.5);
    const vocabCount = target - grammarCount;

    const prompt = [
      "You create a one-time English placement test for a language app.",
      "Output ONLY a JSON object (no markdown) with this shape:",
      `{"questions":[{"id":"q1","type":"grammar","themeId":"workplace","prompt":"...","options":["A","B","C","D"],"correctIndex":0}]}`,
      "Rules:",
      `- Exactly ${target} items; include ${grammarCount} grammar and ${vocabCount} vocabulary (type is exactly "grammar" or "vocabulary").`,
      "- Four distinct options per question, one clearly correct, British or American English is fine (be consistent in one test).",
      "- Prioritize real-world context tied to the user's knowledge tags (vocabulary, micro-scenarios) when possible, but do not name private data verbatim—stay generic.",
      `- Learner CEFR hint: ${ctx.cefrHint}.`,
      "- Knowledge tags (highest priority for themed questions): " +
        ctx.knowledgeTags.join("; "),
      "- Theme catalogue (use themeId from here when a question fits; otherwise omit themeId or use daily_life): " +
        themeSummary,
      "Generate ids q1..q" + String(target) + " as string ids. correctIndex 0-3.",
    ].join("\n");

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: prompt }] },
          ],
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

  private normalizeQuestions(raw: PlacementQuestion[]): PlacementQuestion[] {
    const out: PlacementQuestion[] = [];
    for (let i = 0; i < raw.length; i++) {
      const q = raw[i];
      if (!q || !q.prompt || !Array.isArray(q.options) || q.options.length !== 4) {
        continue;
      }
      const type =
        q.type === "vocabulary" || q.type === "grammar" ? q.type : "grammar";
      const idx = [0, 1, 2, 3].includes(q.correctIndex) ? q.correctIndex : 0;
      out.push({
        id: String(q.id || `q${i + 1}`),
        type,
        themeId: q.themeId,
        prompt: String(q.prompt).trim(),
        options: [
          String(q.options[0]),
          String(q.options[1]),
          String(q.options[2]),
          String(q.options[3]),
        ] as [string, string, string, string],
        correctIndex: idx as 0 | 1 | 2 | 3,
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
        id: "q1",
        type: "grammar",
        themeId: themeIds[0],
        prompt: `Choose the best option: "By next month I ____ the course prerequisites." (context: ${tagLine})`,
        options: [
          "will have completed",
          "complete",
          "have been completing",
          "completed",
        ],
        correctIndex: 0,
      },
      {
        id: "q2",
        type: "grammar",
        themeId: themeIds[1] ?? "daily_life",
        prompt: `Select the option with correct article use: a sentence about a recent "____" meeting in your field.`,
        options: [
          "I led an important the meeting",
          "I led an important meeting",
          "I led important a meeting",
          "I led the important an meeting",
        ],
        correctIndex: 1,
      },
      {
        id: "q3",
        type: "vocabulary",
        themeId: themeIds[2] ?? "hobbies",
        prompt: `What does "to pull off" most likely mean in casual English?`,
        options: [
          "to cancel a plan",
          "to achieve something difficult successfully",
          "to start an argument",
          "to give up a hobby",
        ],
        correctIndex: 1,
      },
      {
        id: "q4",
        type: "vocabulary",
        themeId: "daily_life",
        prompt: `Choose the best collocation: "We need to make ____ before the trip."`,
        options: [
          "an arrangement / arrangements",
          "a homework",
          "a fun",
          "a damage",
        ],
        correctIndex: 0,
      },
      {
        id: "q5",
        type: "grammar",
        themeId: "travel",
        prompt: `Choose the right conditional: "If I ____ the earlier train, I would have arrived on time."`,
        options: ["took", "had taken", "have taken", "will take"],
        correctIndex: 1,
      },
      {
        id: "q6",
        type: "grammar",
        themeId: "workplace",
        prompt: `Select the best relative clause: "The manager, ____ department exceeded targets, was promoted."`,
        options: ["which", "whose", "whom", "where"],
        correctIndex: 1,
      },
      {
        id: "q7",
        type: "vocabulary",
        themeId: "education",
        prompt: `Which word best fits: "The lecture was so ____ that many students left early."`,
        options: ["fascinated", "tedious", "fascinatingly", "bored"],
        correctIndex: 1,
      },
      {
        id: "q8",
        type: "vocabulary",
        themeId: "workplace",
        prompt: `Choose the most natural phrase for giving polite feedback: "I think the draft could be ____"`,
        options: [
          "more stronger",
          "stronger a bit",
          "a little stronger",
          "more strong little",
        ],
        correctIndex: 2,
      },
      {
        id: "q9",
        type: "grammar",
        themeId: "hobbies",
        prompt: `Pick the right preposition: "She is keen ____ learning photography."`,
        options: ["of", "on", "for", "with"],
        correctIndex: 1,
      },
      {
        id: "q10",
        type: "vocabulary",
        themeId: "daily_life",
        prompt: `What is the best meaning of "reliable" in a product review?`,
        options: [
          "expensive and rare",
          "likely to be dangerous",
          "consistently good and trustworthy",
          "fashionable this season",
        ],
        correctIndex: 2,
      },
      {
        id: "q11",
        type: "grammar",
        themeId: "workplace",
        prompt: `Choose the right connector: "____ the delay, the team met the client deadline."`,
        options: [
          "Although",
          "However",
          "Despite",
          "Because of",
        ],
        correctIndex: 2,
      },
      {
        id: "q12",
        type: "vocabulary",
        themeId: "education",
        prompt: `Which word is closest in meaning to "postpone"?`,
        options: ["hurry", "cancel forever", "put off to a later time", "finish early"],
        correctIndex: 2,
      },
    ];
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
