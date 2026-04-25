import type { AuthSession, PlacementStatus, UserProfile } from "./types";

export function getApiBase(): string {
  const u = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200";
  return u.replace(/\/$/, "");
}

function apiUrl(path: string): string {
  return getApiBase() + (path.startsWith("/") ? path : `/${path}`);
}

type FetchOpts = RequestInit & { token?: string | null };

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
    const t = await res.text();
    throw new Error(t || `Login failed (${res.status})`);
  }
  return (await res.json()) as AuthSession;
}

export async function apiRegister(body: {
  name: string;
  email: string;
  password: string;
  englishLevel?: string;
  hobbies?: string[];
  education?: string;
  workField?: string;
  nativeLanguage?: string;
}): Promise<AuthSession> {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Register failed (${res.status})`);
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
