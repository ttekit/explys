/**
 * Placement result copy: vocabulary phrases and grammar topic labels derived from
 * persisted draft rows + submitted answers. Keep iframe inline script in sync
 * (`grammarTopicRules` mirroring GRAMMAR_TOPIC_RULES).
 */

import type { PlacementStoredDraftQuestion } from "./placement-draft.types";

export type PlacementSummaryDto = {
  /** Correctly answered vocabulary items — typically answer phrases. */
  vocabularyReinforced: string[];
  /** Vocabulary items to revisit — the correct answer for items missed. */
  vocabularyToReview: string[];
  /** Grammar focus areas touched (deduped). */
  grammarYouPracticed: string[];
  /** Grammar focus areas where at least one question was missed. */
  grammarToRevisit: string[];
};

type SummaryRow = PlacementStoredDraftQuestion & {
  promptShort?: string;
  answerText?: string;
};

const GRAMMAR_TOPIC_RULES: ReadonlyArray<{ re: RegExp; label: string }> = [
  {
    re: /\bif\b[\s\S]{0,80}\b(would have|had taken|hadn't)\b|third conditional|mixed conditional/i,
    label: "conditionals",
  },
  {
    re: /\b(will have|future perfect|by next|by then)\b/i,
    label: "future perfect and timelines",
  },
  {
    re: /\b(have been|has been|present perfect|past perfect)\b/i,
    label: "perfect tenses",
  },
  {
    re: /\b(relative pronoun|relative clause)\b|\bwhose\b|\bwhich\b|\bwhom\b/i,
    label: "relative clauses",
  },
  {
    re: /\b(despite|although|however|because of|even though)\b/i,
    label: "connectors and contrast",
  },
  { re: /\b(keen on|depend on|good at)\b/i, label: "prepositions and patterns" },
  {
    re: /\b(article|choose the correct article|\ba\b\/\ban\b\/\bthe\b)\b/i,
    label: "articles (a / an / the)",
  },
  { re: /\b(passive|was built|been made|being done)\b/i, label: "passive voice" },
  {
    re: /\b(gerund|infinitive|vs\.?\s*to\s+)/i,
    label: "gerunds and infinitives",
  },
  {
    re: /\bmodal\b|\b(should|must|might|could|would)\b(?![a-z])/i,
    label: "modal verbs",
  },
  {
    re: /\b(subjunctive|if I were|were I)\b/i,
    label: "subjunctive / unreal forms",
  },
  {
    re: /\b(comparative|superlative|more than|less than|as \w+ as)\b/i,
    label: "comparatives",
  },
  { re: /\b(subject-verb|agreement|plural verb)\b/i, label: "subject–verb agreement" },
  { re: /\b(inversion|word order|so do I|neither do I)\b/i, label: "word order" },
];

function inferGrammarTopics(prompt: string): string[] {
  const topics: string[] = [];
  for (const { re, label } of GRAMMAR_TOPIC_RULES) {
    if (re.test(prompt)) {
      topics.push(label);
    }
  }
  if (topics.length === 0) {
    topics.push("general sentence patterns");
  }
  return [...new Set(topics)];
}

function takeUniqueTrimmed(items: string[], max: number, maxLen: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let raw of items) {
    let t = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (t.length > maxLen) {
      t = t.slice(0, maxLen - 1) + "…";
    }
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export function buildPlacementSummary(
  rows: readonly SummaryRow[],
  answers: Record<string, number>,
): PlacementSummaryDto {
  const vReinforced: string[] = [];
  const vReview: string[] = [];
  const gPracticed: string[] = [];
  const gReview: string[] = [];

  for (const row of rows) {
    const pick = answers[row.id];
    const ok = typeof pick === "number" && pick === row.correctIndex;
    const type = row.type ?? "grammar";

    if (type === "vocabulary") {
      const phrase = row.answerText?.trim();
      if (!phrase) {
        continue;
      }
      if (ok) {
        vReinforced.push(phrase);
      } else {
        vReview.push(phrase);
      }
      continue;
    }

    const prompt = row.promptShort?.trim() || "";
    const topics = inferGrammarTopics(prompt);
    for (const t of topics) {
      gPracticed.push(t);
    }
    if (!ok) {
      for (const t of topics) {
        gReview.push(t);
      }
    }
  }

  return {
    vocabularyReinforced: takeUniqueTrimmed(vReinforced, 8, 120),
    vocabularyToReview: takeUniqueTrimmed(vReview, 8, 120),
    grammarYouPracticed: takeUniqueTrimmed(gPracticed, 12, 80),
    grammarToRevisit: takeUniqueTrimmed(gReview, 8, 80),
  };
}
