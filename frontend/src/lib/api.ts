/**
 * API client (aligned with `test-nextjs/lib/api.ts`): base URL, `x-api-token`, JSON error parsing, optional JWT.
 */
type FetchOpts = RequestInit & { token?: string | null };

export function getApiBase(): string {
  const u = import.meta.env.VITE_API_BASE_URL || "http://localhost:4200";
  if (typeof u !== "string" || !u.trim()) {
    return "http://localhost:4200";
  }
  return u.replace(/\/$/, "");
}

/** @deprecated use `getApiBase()` */
export const getApiBaseUrl = getApiBase;

function apiPath(path: string): string {
  return getApiBase() + (path.startsWith("/") ? path : `/${path}`);
}

export function apiUrl(path: string): string {
  return apiPath(path);
}

/** Parses Nest/JSON error bodies (same idea as `test-nextjs/lib/api.ts`). */
export async function readApiErrorBody(res: Response): Promise<string> {
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

export async function getResponseErrorMessage(
  response: Response,
): Promise<string> {
  return readApiErrorBody(response);
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
  const key = import.meta.env.VITE_API_TOKEN;
  if (key) {
    headers.set("x-api-token", key);
  }
  return fetch(apiPath(path), { ...rest, headers });
}
