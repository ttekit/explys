import type {
  AuthSession,
  ContentRecommendationsResponse,
  ContentVideo,
  ContentVideoIframePayload,
  PlacementStatus,
  GenerateComprehensionTestsResponse,
  PostWatchSurveyStartResponse,
  SubmitComprehensionTestResponse,
  UserProfile,
  VideoCaptions,
} from "./types";

export function getApiBase(): string {
  const u = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200";
  return u.replace(/\/$/, "");
}

/**
 * `src` for an iframe with the same comprehension test as `POST /content-video/:id/tests/generate`
 * (HTML is generated on load; add `x-api-token` in production only if your gateway requires it for GET).
 */
export function comprehensionTestsIframeUrl(
  contentVideoId: number,
  userId?: number | null,
): string {
  const u = new URL(
    getApiBase() + `/content-video/${contentVideoId}/tests/iframe`,
  );
  if (userId != null && userId > 0) {
    u.searchParams.set("userId", String(userId));
  }
  return u.toString();
}

function apiUrl(path: string): string {
  return getApiBase() + (path.startsWith("/") ? path : `/${path}`);
}

type FetchOpts = RequestInit & { token?: string | null };

/** Parses Nest/JSON error bodies so messages are readable in the UI. */
async function readApiErrorBody(res: Response): Promise<string> {
  const t = await res.text();
  if (!t) return `Request failed (${res.status})`;
  try {
    const j = JSON.parse(t) as { message?: string | string[]; error?: string };
    if (Array.isArray(j.message)) {
      return j.message.join("; ");
    }
    if (typeof j.message === "string" && j.message) {
      return j.message;
    }
    if (typeof j.error === "string" && j.error) {
      return j.error;
    }
  } catch {
    // not JSON
  }
  return t;
}

export async function apiFetch(
  path: string,
  init: FetchOpts = {},
): Promise<Response> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (
    rest.body != null &&
    typeof rest.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const key = process.env.NEXT_PUBLIC_API_TOKEN;
  if (key) {
    headers.set("x-api-token", key);
  }
  return fetch(apiUrl(path), { ...rest, headers });
}

export function placementTestIframeSrc(accessToken: string): string {
  return `${getApiBase()}/placement-test/document?access_token=${encodeURIComponent(accessToken)}`;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res) || `Login failed (${res.status})`);
  }
  return (await res.json()) as AuthSession;
}

export async function apiRegister(body: {
  name: string;
  email: string;
  password: string;
  role?: string;
  englishLevel?: string;
  hobbies?: string[];
  education?: string;
  workField?: string;
  nativeLanguage?: string;
  favoriteGenres?: number[];
  hatedGenres?: number[];
  knownLanguages?: string[];
  knownLanguageLevels?: Array<{ language: string; level: string }>;
  teacherGrades?: string;
  teacherTopics?: string[];
  studentNames?: string;
  studentGrade?: string;
  studentProblemTopics?: string[];
  studentAccounts?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }>;
}): Promise<AuthSession> {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      (await readApiErrorBody(res)) || `Register failed (${res.status})`,
    );
  }
  return (await res.json()) as AuthSession;
}

export async function apiGetUser(
  id: number,
  token: string,
): Promise<UserProfile> {
  const res = await apiFetch(`/users/${id}`, { method: "GET", token });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `GET /users/${id} failed (${res.status})`);
  }
  return (await res.json()) as UserProfile;
}

export async function apiListUsers(token: string): Promise<UserProfile[]> {
  const res = await apiFetch("/users", { method: "GET", token });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `GET /users failed (${res.status})`);
  }
  return (await res.json()) as UserProfile[];
}

export async function apiPlacementStatus(
  token: string,
): Promise<PlacementStatus> {
  const res = await apiFetch("/placement-test/status", { method: "GET", token });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Placement status failed (${res.status})`);
  }
  return (await res.json()) as PlacementStatus;
}

export async function apiGetContentRecommendations(
  userId: number,
): Promise<ContentRecommendationsResponse> {
  const res = await apiFetch(`/content-recommendations/for-user/${userId}`, {
    method: "GET",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Recommendations failed (${res.status})`);
  }
  return (await res.json()) as ContentRecommendationsResponse;
}

export async function apiGetContentVideo(id: number): Promise<ContentVideo> {
  const res = await apiFetch(`/content-video/${id}`, { method: "GET" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `GET /content-video/${id} failed (${res.status})`);
  }
  return (await res.json()) as ContentVideo;
}

export async function apiGetContentVideoIframe(
  id: number,
): Promise<ContentVideoIframePayload> {
  const res = await apiFetch(`/content-video/${id}/iframe`, { method: "GET" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `GET /content-video/${id}/iframe failed (${res.status})`);
  }
  return (await res.json()) as ContentVideoIframePayload;
}

export async function apiGenerateContentVideoTags(id: number): Promise<unknown> {
  const res = await apiFetch(`/content-video/${id}/tags/generate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `POST /content-video/${id}/tags/generate failed (${res.status})`);
  }
  return res.json();
}

export async function apiGenerateComprehensionTests(
  id: number,
  userId?: number | null,
): Promise<GenerateComprehensionTestsResponse> {
  const res = await apiFetch(`/content-video/${id}/tests/generate`, {
    method: "POST",
    body: JSON.stringify({ userId: userId ?? null }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      t || `POST /content-video/${id}/tests/generate failed (${res.status})`,
    );
  }
  return (await res.json()) as GenerateComprehensionTestsResponse;
}

export async function apiSubmitComprehensionTest(
  contentVideoId: number,
  body: { token: string; answers: Record<string, number> },
): Promise<SubmitComprehensionTestResponse> {
  const res = await apiFetch(`/content-video/${contentVideoId}/tests/submit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `POST /content-video/${contentVideoId}/tests/submit failed`);
  }
  return (await res.json()) as SubmitComprehensionTestResponse;
}

export async function apiRegenerateContentVideoCaptions(
  id: number,
): Promise<VideoCaptions | null> {
  const res = await apiFetch(`/content-video/${id}/captions/regenerate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      t || `POST /content-video/${id}/captions/regenerate failed (${res.status})`,
    );
  }
  const j: unknown = await res.json();
  if (j == null) return null;
  if (typeof j === "object" && j !== null && "subtitlesFileLink" in j) {
    return j as VideoCaptions;
  }
  return null;
}

export async function apiCreateContentWithVideo(opts: {
  file: File;
  name: string;
  description: string;
  friendlyLink: string;
}): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", opts.file);
  fd.append("name", opts.name);
  fd.append("description", opts.description);
  fd.append("friendlyLink", opts.friendlyLink);
  const res = await apiFetch("/contents/create", { method: "POST", body: fd });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `POST /contents/create failed (${res.status})`);
  }
  return res.json();
}

/**
 * Call when the video ends: records a watch, bumps stats, returns generated survey questions.
 * POST /content-video/:id/watch-complete
 */
export async function apiPostContentVideoWatchComplete(
  contentVideoId: number,
  userId: number | null,
): Promise<PostWatchSurveyStartResponse> {
  const res = await apiFetch(`/content-video/${contentVideoId}/watch-complete`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      t || `POST /content-video/${contentVideoId}/watch-complete failed (${res.status})`,
    );
  }
  return (await res.json()) as PostWatchSurveyStartResponse;
}

/** POST /content-video/surveys/:surveyId/submit */
export async function apiSubmitPostWatchSurvey(
  surveyId: number,
  answers: Record<string, string>,
): Promise<{ ok: true; surveyId: number }> {
  const res = await apiFetch(`/content-video/surveys/${surveyId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      t || `POST /content-video/surveys/${surveyId}/submit failed (${res.status})`,
    );
  }
  return (await res.json()) as { ok: true; surveyId: number };
}
