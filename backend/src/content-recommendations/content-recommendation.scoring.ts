import { clamp, getBaseLevel } from 'src/alcorythm/alcorythm-scoring.util';
import { VIDEO_SYSTEM_TAG_LEVELS } from 'src/contents/video-content-metadata.constants';

/** Maps CEFR labels to [0,1] difficulty units (aligned with getBaseLevel). */
const CEFR_UNIT: Record<string, number> = {
  'Pre-A1': 0.05,
  A1: 0.1,
  A2: 0.2,
  B1: 0.4,
  B2: 0.6,
  C1: 0.8,
  C2: 1.0,
};

const CEFR_ALLOWED = new Set<string>(VIDEO_SYSTEM_TAG_LEVELS as unknown as string[]);

/**
 * User-reported or profile CEFR / English level string → unit on [0,1].
 */
export function userEnglishLevelToCefrUnit(level: string | null | undefined): number {
  if (!level?.trim()) {
    return 0.2;
  }
  const t = level.trim();
  if (CEFR_UNIT[t] !== undefined) {
    return CEFR_UNIT[t];
  }
  return getBaseLevel(t.toUpperCase());
}

/**
 * Video `ContentStats.systemTags` (CEFR list) → average difficulty in [0,1].
 */
export function videoSystemTagsToCefrUnit(systemTags: string[]): number {
  const vals = systemTags
    .filter((s) => CEFR_ALLOWED.has(s))
    .map((s) => CEFR_UNIT[s] ?? 0.4);
  if (vals.length === 0) {
    return 0.4;
  }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Vocabulary / knowledge strength from per-topic scores [0,1] (user_language_data).
 */
export function vocabularyStrengthFromTopicScores(
  scores: number[],
  fallback: number,
): number {
  if (scores.length === 0) {
    return clamp(fallback, 0, 1);
  }
  return clamp(
    scores.reduce((a, b) => a + b, 0) / scores.length,
    0,
    1,
  );
}

function tokenSet(tokens: string[]): Set<string> {
  const s = new Set<string>();
  for (const t of tokens) {
    const x = t.trim().toLowerCase();
    if (x.length > 0) {
      s.add(x);
    }
  }
  return s;
}

/**
 * Hobbies, interests, topic names, tag names, work/education nuggets for theme matching to video `userTags`.
 */
export function buildUserThemeTokens(input: {
  hobbies: string[];
  interests: string[];
  workField: string | null;
  education: string | null;
  selectedTopicNames: string[];
  strongTopicTagNames: string[];
}): Set<string> {
  const parts: string[] = [
    ...input.hobbies,
    ...input.interests,
    ...input.selectedTopicNames,
    ...input.strongTopicTagNames,
  ];
  if (input.workField?.trim()) {
    parts.push(input.workField);
  }
  if (input.education?.trim()) {
    parts.push(input.education);
  }
  return tokenSet(parts);
}

/**
 * 0 = no match, 1 = strong overlap with video userTags.
 */
export function userThemeMatchScore(
  videoUserTags: string[],
  userTokens: Set<string>,
): number {
  if (videoUserTags.length === 0) {
    return 0.55;
  }
  if (userTokens.size === 0) {
    return 0.4;
  }
  let weight = 0;
  for (const raw of videoUserTags) {
    const v = raw.trim().toLowerCase();
    if (userTokens.has(v)) {
      weight += 1;
      continue;
    }
    for (const u of userTokens) {
      if (v.length > 2 && (v.includes(u) || u.includes(v))) {
        weight += 0.65;
        break;
      }
    }
  }
  return clamp(weight / videoUserTags.length, 0, 1);
}

/**
 * Prefer videos near “ideal” load: user base + small stretch from vocabulary.
 */
export function targetProcessingComplexity(
  userCefrUnit: number,
  vocabularyStrength: number,
): number {
  const v = clamp(vocabularyStrength, 0, 1);
  const base = 2.5 + userCefrUnit * 4.5;
  const boost = (v - 0.3) * 2;
  return clamp(base + boost, 1, 10);
}

export function processingComplexityFit(
  videoComplexity: number | null,
  target: number,
): number {
  const c = videoComplexity != null ? videoComplexity : 5;
  return clamp(1 - Math.abs(c - target) / 5, 0, 1);
}

/**
 * Slight “i+1” band: a bit above user is OK; far below/above is worse.
 */
export function cefrBandFit(userUnit: number, videoUnit: number): number {
  const delta = videoUnit - userUnit;
  if (delta >= -0.12 && delta <= 0.22) {
    return 1;
  }
  if (delta < -0.12) {
    return clamp(1 + delta * 4, 0, 1);
  }
  return clamp(1 - (delta - 0.22) * 2.2, 0, 1);
}

/**
 * If the video is linked to topics, higher user scores on those topics → better fit.
 */
export function topicKnowledgeFit(
  videoTopicIds: number[],
  topicIdToUserScore: Map<number, number>,
): number {
  if (videoTopicIds.length === 0) {
    return 0.55;
  }
  let s = 0;
  for (const id of videoTopicIds) {
    s += topicIdToUserScore.get(id) ?? 0.38;
  }
  return clamp(s / videoTopicIds.length, 0, 1);
}

export type ScoreWeights = {
  cefr: number;
  complexity: number;
  themes: number;
  topicKnowledge: number;
};

const DEFAULT_WEIGHTS: ScoreWeights = {
  cefr: 0.3,
  complexity: 0.2,
  themes: 0.25,
  topicKnowledge: 0.25,
};

export function totalWeightedScore(
  parts: { cefr: number; complexity: number; themes: number; topicKnowledge: number },
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): number {
  return clamp(
    parts.cefr * weights.cefr +
      parts.complexity * weights.complexity +
      parts.themes * weights.themes +
      parts.topicKnowledge * weights.topicKnowledge,
    0,
    1,
  );
}
