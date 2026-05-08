import { UserProfileContext } from './alcorythm.types';

export const AI_ALGORITHM_VERSION = 'v3';

export function aggregateSkillScore(
  listening: number,
  vocabulary: number,
  grammar: number,
): number {
  return clamp((listening + vocabulary + grammar) / 3);
}

/**
 * Split a blended per-topic strength [0,1] into listening / vocabulary / grammar using
 * topic tags, name, profile match strengths, and light profile signals.
 */
export function splitTopicSkillScores(params: {
  blended: number;
  topicName: string;
  tagNames: string[];
  primaryStrength: number;
  secondaryStrength: number;
  normalizedComplexity: number;
  profile: UserProfileContext;
}): { listening: number; vocabulary: number; grammar: number } {
  const hay = `${params.topicName} ${params.tagNames.join(' ')}`.toLowerCase();

  let listeningAdj = 0;
  if (
    /\b(listen|listening|podcast|audio|pronunciation|accent|conversation|dialogue|dialog)\b/.test(
      hay,
    )
  ) {
    listeningAdj += 0.07;
  }
  if (params.normalizedComplexity >= 0.55) {
    listeningAdj += 0.03;
  }
  const listenHobby = params.profile.hobbies.some((h) =>
    /\b(podcast|film|movie|series|youtube|music|radio|audiobook|streaming|concert|gig)\b/i.test(
      h,
    ),
  );
  if (listenHobby) {
    listeningAdj += 0.065;
  }

  let vocabularyAdj = 0;
  if (
    /\b(vocab|vocabulary|word|idiom|phrase|lexis|collocation|expression|phrasal)\b/.test(
      hay,
    )
  ) {
    vocabularyAdj += 0.07;
  }

  const readHobby = params.profile.hobbies.some((h) =>
    /\b(read|reading|books|novel|literature|manga|comics|blogs?|writing|journal)\b/i.test(
      h,
    ),
  );
  if (readHobby) {
    vocabularyAdj += 0.055;
  }

  vocabularyAdj +=
    0.1 * params.primaryStrength + 0.075 * params.secondaryStrength;

  let grammarAdj = 0;
  if (
    /\b(grammar|tense|clause|syntax|structure|article|preposition|modal)\b/.test(hay)
  ) {
    grammarAdj += 0.07;
  }
  const formal =
    Boolean(params.profile.education?.trim()) ||
    Boolean(params.profile.workField?.trim()) ||
    Boolean(params.profile.job?.trim());
  if (formal) {
    grammarAdj += 0.055;
  }

  const meanAdj = (listeningAdj + vocabularyAdj + grammarAdj) / 3;
  listeningAdj -= meanAdj;
  vocabularyAdj -= meanAdj;
  grammarAdj -= meanAdj;

  return {
    listening: clamp(params.blended + listeningAdj),
    vocabulary: clamp(params.blended + vocabularyAdj),
    grammar: clamp(params.blended + grammarAdj),
  };
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function getBaseLevel(englishLevel?: string | null): number {
  const map: Record<string, number> = {
    A1: 0.1,
    A2: 0.2,
    B1: 0.4,
    B2: 0.6,
    C1: 0.8,
    C2: 1,
  };

  if (!englishLevel) {
    return 0.2;
  }

  return map[englishLevel.toUpperCase()] ?? 0.2;
}

export function normalizeKeywords(values: Array<string | null | undefined>): string[] {
  return values
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim().toLowerCase());
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 1);
}

export function keywordMatchStrength(
  topicName: string,
  tagNames: string[],
  keywords: string[],
): number {
  if (!keywords.length) {
    return 0;
  }

  const haystack = `${topicName} ${tagNames.join(' ')}`.toLowerCase();
  const hayTokens = new Set(tokenize(haystack));
  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (!normalizedKeyword) {
      continue;
    }

    if (haystack.includes(normalizedKeyword) || normalizedKeyword.includes(haystack)) {
      score += 1;
      continue;
    }

    const keywordTokens = tokenize(normalizedKeyword);
    if (!keywordTokens.length) {
      continue;
    }

    const matched = keywordTokens.filter((token) => hayTokens.has(token)).length;
    if (matched > 0) {
      score += matched / keywordTokens.length;
    }
  }

  return clamp(score / keywords.length);
}

export function calculateConfidence(params: {
  hasEnglishLevel: boolean;
  hasLanguageBackground: boolean;
  hasPrimarySignals: boolean;
  hasSecondarySignals: boolean;
  hasSelectedTopics: boolean;
}): number {
  let confidence = 0.25;

  if (params.hasEnglishLevel) {
    confidence += 0.25;
  }
  if (params.hasLanguageBackground) {
    confidence += 0.1;
  }
  if (params.hasPrimarySignals) {
    confidence += 0.24;
  }
  if (params.hasSecondarySignals) {
    confidence += 0.2;
  }
  if (params.hasSelectedTopics) {
    confidence += 0.15;
  }

  return clamp(confidence);
}

export function getDeterministicTagScore(params: {
  base: number;
  tagName: string;
  topicNames: string[];
  primaryKeywords: string[];
  secondaryKeywords: string[];
  selectedTopicIds: Set<number>;
  tagTopicIds: number[];
}): number {
  let boost = 0;

  const normalizedTag = params.tagName.toLowerCase();
  const normalizedTopics = params.topicNames.map((name) => name.toLowerCase());

  const primaryMatch = params.primaryKeywords.some(
    (keyword) =>
      normalizedTag.includes(keyword) ||
      keyword.includes(normalizedTag) ||
      normalizedTopics.some((topicName) => topicName.includes(keyword) || keyword.includes(topicName)),
  );

  const secondaryMatch = params.secondaryKeywords.some(
    (keyword) =>
      normalizedTag.includes(keyword) ||
      keyword.includes(normalizedTag) ||
      normalizedTopics.some((topicName) => topicName.includes(keyword) || keyword.includes(topicName)),
  );

  const selectedMatch = params.tagTopicIds.some((topicId) => params.selectedTopicIds.has(topicId));

  if (primaryMatch) {
    boost += 0.3;
  }
  if (secondaryMatch) {
    boost += 0.17;
  }
  if (selectedMatch) {
    boost += 0.2;
  }

  return clamp(params.base + boost);
}

export function buildProfileContext(profile: any): UserProfileContext {
  const knownLanguageLevels = Array.isArray(profile.knownLanguageLevels)
    ? profile.knownLanguageLevels
        .filter((item: any) => item && typeof item.language === 'string' && typeof item.level === 'string')
        .map((item: any) => ({ language: item.language, level: item.level }))
    : [];

  return {
    englishLevel: profile.englishLevel,
    nativeLanguage: profile.nativeLanguage,
    knownLanguages: profile.knownLanguages ?? [],
    knownLanguageLevels,
    education: profile.education,
    workField: profile.workField,
    job: profile.job,
    hobbies: profile.hobbies ?? [],
    selectedTopicIds: new Set<number>((profile.selectedTopics ?? []).map((topic: any) => topic.id)),
    selectedTopicNames: (profile.selectedTopics ?? []).map((topic: any) => topic.name),
  };
}

export function getLanguageBackgroundBoost(params: {
  nativeLanguage?: string | null;
  knownLanguages: string[];
  knownLanguageLevels: Array<{ language: string; level: string }>;
}): number {
  const normalizedNative = (params.nativeLanguage ?? '').trim().toLowerCase();
  const normalizedKnown = params.knownLanguages.map((value) => value.trim().toLowerCase());

  const hasEnglish =
    normalizedNative === 'en' ||
    normalizedNative === 'english' ||
    normalizedKnown.includes('en') ||
    normalizedKnown.includes('english');

  if (hasEnglish) {
    return 0.2;
  }

  if (normalizedKnown.length >= 2) {
    return 0.05;
  }

  const advancedKnown = params.knownLanguageLevels.some((item) =>
    ['b2', 'c1', 'c2', 'advanced', 'fluent', 'native'].includes(item.level.trim().toLowerCase()),
  );
  if (advancedKnown) {
    return 0.05;
  }

  return 0;
}
