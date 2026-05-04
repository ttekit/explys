import { createHmac, timingSafeEqual } from "node:crypto";

export type GradingItem = {
  id: string;
  correctIndex: number;
  category: "comprehension" | "grammar";
};

type SignedPayloadV1 = {
  v: 1;
  exp: number;
  contentVideoId: number;
  userId: number | null;
  items: GradingItem[];
};

const enc = (b: Buffer) => b.toString("base64url");
const dec = (s: string) => Buffer.from(s, "base64url");

export function createGradingToken(
  payload: Omit<SignedPayloadV1, "v" | "exp"> & { exp: number },
  secret: string,
): string {
  const body: SignedPayloadV1 = { v: 1, ...payload };
  const json = JSON.stringify(body);
  const b = Buffer.from(json, "utf8");
  const mac = createHmac("sha256", secret).update(b).digest();
  return `${enc(b)}.${enc(mac)}`;
}

export function parseGradingToken(
  token: string,
  secret: string,
): SignedPayloadV1 | null {
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
  const p = parsed as Partial<SignedPayloadV1>;
  if (p.v !== 1) {
    return null;
  }
  if (typeof p.exp !== "number" || Date.now() > p.exp) {
    return null;
  }
  if (typeof p.contentVideoId !== "number" || !Array.isArray(p.items)) {
    return null;
  }
  return p as SignedPayloadV1;
}

export function countCorrect(
  items: GradingItem[],
  answers: Record<string, number>,
): {
  total: number;
  correct: number;
  comprehension: { c: number; t: number };
  grammar: { c: number; t: number };
} {
  let correct = 0;
  let compC = 0,
    compT = 0,
    gramC = 0,
    gramT = 0;
  for (const it of items) {
    const picked = answers[it.id];
    const ok = typeof picked === "number" && picked === it.correctIndex;
    if (ok) {
      correct += 1;
    }
    if (it.category === "grammar") {
      gramT += 1;
      if (ok) {
        gramC += 1;
      }
    } else {
      compT += 1;
      if (ok) {
        compC += 1;
      }
    }
  }
  return {
    total: items.length,
    correct,
    comprehension: { c: compC, t: compT },
    grammar: { c: gramC, t: gramT },
  };
}

/** Score delta in [-0.08, 0.08] from percentage correct. */
export function knowledgeDelta(pct: number): number {
  return 0.12 * (pct - 0.5);
}

/**
 * Maps post-video test results to per-skill deltas. Comprehension items → listening + vocabulary;
 * grammar items → grammar only.
 */
export function knowledgeDeltasFromComprehensionStats(stats: {
  comprehension: { c: number; t: number };
  grammar: { c: number; t: number };
}): { listening: number; vocabulary: number; grammar: number } {
  const compPct =
    stats.comprehension.t > 0 ? stats.comprehension.c / stats.comprehension.t : null;
  const gramPct = stats.grammar.t > 0 ? stats.grammar.c / stats.grammar.t : null;
  const compDelta = compPct != null ? knowledgeDelta(compPct) : 0;
  const gramDelta = gramPct != null ? knowledgeDelta(gramPct) : 0;
  return {
    listening: compDelta * 0.55,
    vocabulary: compDelta * 0.45,
    grammar: gramDelta,
  };
}
