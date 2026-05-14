import { createHmac, timingSafeEqual } from "node:crypto";

/** Validity window for signed quiz payloads (lesson comprehension + weekly review). */
export const GRADING_TOKEN_TTL_MS = 30 * 60 * 1000;

export type McqCategory = "grammar" | "vocabulary" | "comprehension";

export type GradingItem =
  | {
      kind: "mcq";
      id: string;
      correctIndex: number;
      category: McqCategory;
      questionStem?: string;
    }
  | {
      kind: "open";
      id: string;
      category: "open";
      questionStem?: string;
    };

export type ParsedGradingPayload = {
  v: 1 | 2 | 3;
  exp: number;
  contentVideoId: number;
  userId: number | null;
  items: GradingItem[];
  /** Present when this token was issued for an error-fixing (remediation) test pass. */
  isErrorFixingTest?: boolean;
  /** Weekly review uses `contentVideoId` 0 and this discriminator. */
  quizKind?: "lesson" | "weekly_review" | "weekly_review_practice";
  /** UTC Monday `YYYY-MM-DD`; required when `quizKind` is `weekly_review` or practice replay. */
  weeklyReviewWeekStart?: string;
};

export type SkillBucketStats = {
  comprehension: { c: number; t: number };
  vocabulary: { c: number; t: number };
  grammar: { c: number; t: number };
  open: { c: number; t: number };
};

const enc = (b: Buffer) => b.toString("base64url");
const dec = (s: string) => Buffer.from(s, "base64url");

export function createGradingToken(
  payload: Omit<ParsedGradingPayload, "v"> & { exp: number },
  secret: string,
): string {
  const items: GradingItem[] = payload.items.map((it) =>
    it.kind === "open"
      ? {
          kind: "open" as const,
          id: it.id,
          category: "open" as const,
          questionStem: it.questionStem,
        }
      : {
          kind: "mcq" as const,
          id: it.id,
          correctIndex: it.correctIndex,
          category: it.category,
          questionStem: it.questionStem,
        },
  );
  const body: ParsedGradingPayload = {
    v: 3,
    exp: payload.exp,
    contentVideoId: payload.contentVideoId,
    userId: payload.userId,
    items,
    ...(payload.isErrorFixingTest === true ?
      { isErrorFixingTest: true as const }
    : {}),
    ...((payload.quizKind === "weekly_review" ||
      payload.quizKind === "weekly_review_practice") &&
    typeof payload.weeklyReviewWeekStart === "string" &&
    payload.weeklyReviewWeekStart.length >= 10 ?
      {
        quizKind: payload.quizKind,
        weeklyReviewWeekStart: payload.weeklyReviewWeekStart,
      }
    : {}),
  };
  const json = JSON.stringify(body);
  const b = Buffer.from(json, "utf8");
  const mac = createHmac("sha256", secret).update(b).digest();
  return `${enc(b)}.${enc(mac)}`;
}

export function parseGradingToken(
  token: string,
  secret: string,
): ParsedGradingPayload | null {
  const parts = (token ?? "").split(".");
  if (parts.length !== 2) {
    return null;
  }
  let data: Buffer;
  let mac: Buffer;
  try {
    data = dec(parts[0]);
    mac = dec(parts[1]);
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret).update(data).digest();
  if (mac.length !== expected.length) {
    return null;
  }
  if (!timingSafeEqual(mac, expected)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const p = parsed as Partial<ParsedGradingPayload>;
  if (p.v !== 1 && p.v !== 2 && p.v !== 3) {
    return null;
  }
  if (typeof p.exp !== "number" || Date.now() > p.exp) {
    return null;
  }
  if (typeof p.contentVideoId !== "number" || !Array.isArray(p.items)) {
    return null;
  }

  if (p.v === 3) {
    const items: GradingItem[] = [];
    for (const raw of p.items) {
      if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
      }
      const it = raw as Record<string, unknown>;
      if (typeof it.id !== "string" || !it.id) {
        return null;
      }
      const stem =
        typeof it.questionStem === "string" ? it.questionStem.trim() : "";
      const stemOut = stem.length > 0 ? stem.slice(0, 400) : undefined;
      if (it.kind === "open") {
        items.push({
          kind: "open",
          id: it.id,
          category: "open",
          questionStem: stemOut,
        });
        continue;
      }
      if (it.kind !== "mcq") {
        return null;
      }
      if (
        typeof it.correctIndex !== "number" ||
        !Number.isInteger(it.correctIndex)
      ) {
        return null;
      }
      const cat = it.category;
      if (cat !== "grammar" && cat !== "vocabulary" && cat !== "comprehension") {
        return null;
      }
      items.push({
        kind: "mcq",
        id: it.id,
        correctIndex: it.correctIndex,
        category: cat,
        questionStem: stemOut,
      });
    }
    for (const it of items) {
      if (!it.questionStem?.trim()) {
        return null;
      }
    }
    const isEft =
      p.isErrorFixingTest === true
        ? true
        : undefined;
    const quizKindParsed =
      p.quizKind === "weekly_review"
        ? ("weekly_review" as const)
        : p.quizKind === "weekly_review_practice"
          ? ("weekly_review_practice" as const)
          : undefined;
    if (
      quizKindParsed === "weekly_review" ||
      quizKindParsed === "weekly_review_practice"
    ) {
      if (typeof p.weeklyReviewWeekStart !== "string") {
        return null;
      }
      const ws = p.weeklyReviewWeekStart.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ws)) {
        return null;
      }
      if (p.contentVideoId !== 0) {
        return null;
      }
      for (const it of items) {
        if (it.kind === "open") {
          return null;
        }
      }
    }
    return {
      v: 3,
      exp: p.exp,
      contentVideoId: p.contentVideoId,
      userId: p.userId ?? null,
      items,
      ...(isEft ? { isErrorFixingTest: true as const } : {}),
      ...(quizKindParsed === "weekly_review" ?
        {
          quizKind: "weekly_review" as const,
          weeklyReviewWeekStart: p.weeklyReviewWeekStart!.trim(),
        }
      : {}),
      ...(quizKindParsed === "weekly_review_practice" ?
        {
          quizKind: "weekly_review_practice" as const,
          weeklyReviewWeekStart: p.weeklyReviewWeekStart!.trim(),
        }
      : {}),
    };
  }

  // v1 / v2: legacy tokens — all MCQ
  const items: GradingItem[] = [];
  for (const raw of p.items) {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const it = raw as Record<string, unknown>;
    if (typeof it.id !== "string" || !it.id) {
      return null;
    }
    if (
      typeof it.correctIndex !== "number" ||
      !Number.isInteger(it.correctIndex)
    ) {
      return null;
    }
    const catRaw = it.category;
    const category: McqCategory =
      catRaw === "grammar" ? "grammar" : "comprehension";
    const stem =
      typeof it.questionStem === "string" ? it.questionStem.trim() : "";
    items.push({
      kind: "mcq",
      id: it.id,
      correctIndex: it.correctIndex,
      category,
      questionStem:
        p.v === 2 && stem.length > 0 ? stem.slice(0, 400) : undefined,
    });
  }
  if (p.v === 2) {
    for (const it of items) {
      if (!it.questionStem?.trim()) {
        return null;
      }
    }
  }
  return {
    v: p.v,
    exp: p.exp,
    contentVideoId: p.contentVideoId,
    userId: p.userId ?? null,
    items,
  };
}

/** MCQ scoring only (numeric answers). */
export function scoreMcqBuckets(
  items: GradingItem[],
  answers: Record<string, number>,
): SkillBucketStats {
  const buckets: SkillBucketStats = {
    comprehension: { c: 0, t: 0 },
    vocabulary: { c: 0, t: 0 },
    grammar: { c: 0, t: 0 },
    open: { c: 0, t: 0 },
  };
  for (const it of items) {
    if (it.kind !== "mcq") {
      continue;
    }
    const picked = answers[it.id];
    const ok = typeof picked === "number" && picked === it.correctIndex;
    if (it.category === "grammar") {
      buckets.grammar.t += 1;
      if (ok) {
        buckets.grammar.c += 1;
      }
    } else if (it.category === "vocabulary") {
      buckets.vocabulary.t += 1;
      if (ok) {
        buckets.vocabulary.c += 1;
      }
    } else {
      buckets.comprehension.t += 1;
      if (ok) {
        buckets.comprehension.c += 1;
      }
    }
  }
  return buckets;
}

export function applyOpenResult(
  buckets: SkillBucketStats,
  openId: string | undefined,
  openPass: boolean,
): SkillBucketStats {
  if (!openId) {
    return buckets;
  }
  return {
    ...buckets,
    open: { c: openPass ? 1 : 0, t: 1 },
  };
}

export function totalCorrectAndQuestions(
  buckets: SkillBucketStats,
): { correct: number; total: number } {
  const correct =
    buckets.comprehension.c +
    buckets.vocabulary.c +
    buckets.grammar.c +
    buckets.open.c;
  const total =
    buckets.comprehension.t +
    buckets.vocabulary.t +
    buckets.grammar.t +
    buckets.open.t;
  return { correct, total };
}

/** Aggregates for API / admin: comprehension slot includes open Q. */
export function legacyComprehensionGrammarStats(buckets: SkillBucketStats): {
  comprehension: { c: number; t: number };
  grammar: { c: number; t: number };
} {
  return {
    comprehension: {
      c: buckets.comprehension.c + buckets.open.c,
      t: buckets.comprehension.t + buckets.open.t,
    },
    grammar: buckets.grammar,
  };
}

export function knowledgeDelta(pct: number): number {
  return 0.12 * (pct - 0.5);
}

/**
 * Skill deltas from four buckets: comprehension MCQ, vocabulary MCQ, grammar MCQ, open summary.
 */
export function knowledgeDeltasFromSkillBuckets(buckets: SkillBucketStats): {
  listening: number;
  vocabulary: number;
  grammar: number;
} {
  const compOpenT = buckets.comprehension.t + buckets.open.t;
  const compOpenC = buckets.comprehension.c + buckets.open.c;
  const listenPct = compOpenT > 0 ? compOpenC / compOpenT : 0.5;

  const vocabT = buckets.vocabulary.t;
  const vocabPct = vocabT > 0 ? buckets.vocabulary.c / vocabT : listenPct;

  const gramT = buckets.grammar.t;
  const gramPct = gramT > 0 ? buckets.grammar.c / gramT : 0.5;

  const listenDelta = knowledgeDelta(listenPct);
  const vocDelta = knowledgeDelta(vocabPct);
  const gramDelta = knowledgeDelta(gramPct);

  return {
    listening: listenDelta * 0.55 + vocDelta * 0.1,
    vocabulary: listenDelta * 0.25 + vocDelta * 0.75,
    grammar: gramDelta,
  };
}

/**
 * @deprecated use knowledgeDeltasFromSkillBuckets; kept for imports that expect old shape.
 */
export function knowledgeDeltasFromComprehensionStats(stats: {
  comprehension: { c: number; t: number };
  grammar: { c: number; t: number };
}): { listening: number; vocabulary: number; grammar: number } {
  const buckets: SkillBucketStats = {
    comprehension: stats.comprehension,
    vocabulary: { c: 0, t: 0 },
    grammar: stats.grammar,
    open: { c: 0, t: 0 },
  };
  return knowledgeDeltasFromSkillBuckets(buckets);
}
