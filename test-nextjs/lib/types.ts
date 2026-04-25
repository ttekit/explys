export type AuthUser = {
  id: number;
  email: string;
  name: string;
};

export type AuthSession = {
  access_token: string;
  user: AuthUser;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  hasCompletedPlacement?: boolean;
  createdAt?: string;
  additionalUserData?: {
    englishLevel?: string | null;
    nativeLanguage?: string | null;
    knownLanguages?: string[];
    knownLanguageLevels?: unknown;
    hobbies?: string[];
    education?: string | null;
    workField?: string | null;
  } | null;
};

export type PlacementStatus = {
  hasCompletedPlacement: boolean;
  shouldShowEntryTest: boolean;
};

/** POST /content-recommendations/for-user/:userId — mirrors backend DTOs when that module is enabled. */
export type ContentRecommendationsResponse = {
  user: {
    cefrUnit: number;
    cefrSource: string | null;
    vocabularyStrength: number;
    targetProcessingComplexity: number;
    themeTokenSample: string[];
    topicRows: number;
  };
  recommendations: Array<{
    rank: number;
    score: number;
    breakdown?: {
      cefr: number;
      complexity: number;
      themes: number;
      topicKnowledge: number;
    };
    contentVideo: {
      id: number;
      contentId: number;
      videoName: string;
      videoDescription: string | null;
      videoLink: string;
      hasCaptions: boolean;
    };
    content: {
      name: string;
      description: string;
      friendlyLink: string;
    };
    stats: {
      systemTags: string[];
      userTags: string[];
      processingComplexity: number | null;
    } | null;
  }>;
};

export type VideoCaptions = {
  subtitlesFileLink: string;
};

/** GET /content-video/:id — shape may include relations when the API returns them. */
export type ContentVideo = {
  id: number;
  contentId: number;
  videoLink: string;
  videoName: string;
  videoDescription: string | null;
  videoCaption?: VideoCaptions | null;
  content?: {
    name: string;
    stats?: {
      systemTags: string[];
      userTags: string[];
      processingComplexity: number | null;
    } | null;
  } | null;
};

export type ContentVideoIframePayload = {
  iframeHtml: string;
};

export type PostWatchSurveyQuestion = {
  id: string;
  type: "likert" | "short_text" | "mcq";
  prompt: string;
  options?: string[];
};

export type PostWatchSurveyStartResponse = {
  surveyId: number;
  questions: PostWatchSurveyQuestion[];
};

export type ComprehensionTestItem = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: "comprehension" | "grammar";
};

/** POST /content-video/:id/tests/generate (optional body: { userId }) */
export type GenerateComprehensionTestsResponse = {
  contentVideoId: number;
  videoName: string;
  source: "gemini" | "fallback";
  tests: ComprehensionTestItem[];
  /** Server-signed payload for POST /content-video/:id/tests/submit (≈2h TTL). */
  gradingToken: string;
  learnerCefr: string | null;
  usedTranscript: boolean;
  vocabularyTermsUsed: number;
};

/** POST /content-video/:id/tests/submit */
export type SubmitComprehensionTestResponse = {
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
};

/** Navigates Prisma nested create response from POST /contents/create. */
export function contentVideoIdFromCreateContent(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const c = data as {
    category?: Array<{ ContentVideo?: Array<{ id?: number }> }>;
  };
  const id = c.category?.[0]?.ContentVideo?.[0]?.id;
  return typeof id === "number" ? id : null;
}
