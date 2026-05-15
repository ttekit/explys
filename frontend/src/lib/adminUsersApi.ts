import { adminApiFetch, readApiErrorBody } from "./api";

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  englishLevel: string | null;
  createdAt: string;
  lastLogin: string | null;
  hasCompletedPlacement: boolean;
  isSuspended: boolean;
  videosWatched: number;
  testsCompleted: number;
};

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const res = await adminApiFetch("/admin/users", { method: "GET" });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return (await res.json()) as AdminUserRow[];
}

/** Lowercase role codes aligned with `parseRoleFromDto` / profile normalization. */
export function normalizeUserRoleCode(role: string): string {
  return role.trim().toLowerCase();
}

export type CreateAdminUserPayload = {
  email: string;
  password: string;
  name: string;
  role?: "adult" | "student" | "teacher" | "admin";
  englishLevel?: string;
};

export async function createAdminUser(
  payload: CreateAdminUserPayload,
): Promise<unknown> {
  const res = await adminApiFetch("/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      method: "CREDENTIALS",
    }),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return res.json();
}

export type PatchAdminUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: "adult" | "student" | "teacher" | "admin";
  englishLevel?: string;
  isSuspended?: boolean;
};

export async function patchAdminUser(
  userId: number,
  patch: PatchAdminUserPayload,
): Promise<unknown> {
  const res = await adminApiFetch(`/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return res.json();
}

export async function deleteAdminUser(userId: number): Promise<void> {
  const res = await adminApiFetch(`/users/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
}

/** Display band for filters (DB may store finer strings). */
export function userLevelBadge(row: AdminUserRow): string {
  const l = row.englishLevel?.trim();
  return l || "—";
}

/** True if user's CEFR label starts with chosen band when exact match misses. */
export function matchesLevelFilter(
  row: AdminUserRow,
  levelFilter: string,
): boolean {
  if (levelFilter === "all") return true;
  const l = row.englishLevel?.trim().toUpperCase() ?? "";
  if (!l) return false;
  const codes = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  if (!codes.includes(levelFilter as (typeof codes)[number])) return true;
  return l.includes(levelFilter) || l.startsWith(levelFilter as string);
}
