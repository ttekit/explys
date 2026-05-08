import { adminApiFetch, readApiErrorBody } from "./api";

export type AdminAnalyticsOverviewDto = {
  from: string;
  to: string;
  watchHours: number;
  watchCompletionsInRange: number;
  distinctWatchLearnersInRange: number;
  surveySubmissionRatePct: number | null;
  newRegistrationsInRange: number;
  totalUsers: number;
  totalContentVideos: number;
  comprehensionAttemptsInRange: number;
  comprehensionAvgScorePct: number | null;
  comprehensionPassRatePct: number | null;
  placementCompletionsInRange: number;
};

export type UserGrowthPointDto = {
  periodStart: string;
  newUsers: number;
  cumulativeUsers: number;
};

export type RecentActivityItemDto = {
  kind: string;
  at: string;
  userId: number;
  userLabel: string;
  detail: string;
};

export type TestsSummaryDto = {
  from: string;
  to: string;
  attempts: number;
  avgScorePct: number | null;
  passRatePct: number | null;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return (await res.json()) as T;
}

/** Presets for dashboards (matches Admin Analytics selector). */
export function analyticsPresetToRange(
  preset: "week" | "month" | "year",
): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime());
  if (preset === "week") {
    from.setUTCDate(from.getUTCDate() - 7);
  } else if (preset === "month") {
    from.setUTCDate(from.getUTCDate() - 30);
  } else {
    from.setUTCFullYear(from.getUTCFullYear() - 1);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Default window aligned with backend (30 days ending now). */
export function defaultAnalyticsRange(): { from: string; to: string } {
  return analyticsPresetToRange("month");
}

export async function fetchAdminOverview(
  from?: string,
  to?: string,
): Promise<AdminAnalyticsOverviewDto> {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const qs = q.toString();
  const path = qs ? `/admin/analytics/overview?${qs}` : "/admin/analytics/overview";
  const res = await adminApiFetch(path, { method: "GET" });
  return parseJson(res);
}

export async function fetchUserGrowth(
  from?: string,
  to?: string,
  granularity: "day" | "month" = "day",
): Promise<UserGrowthPointDto[]> {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  q.set("granularity", granularity);
  const res = await adminApiFetch(`/admin/analytics/users-growth?${q}`, {
    method: "GET",
  });
  return parseJson<UserGrowthPointDto[]>(res);
}

export async function fetchRecentActivity(
  limit = 20,
): Promise<RecentActivityItemDto[]> {
  const res = await adminApiFetch(
    `/admin/analytics/recent-activity?limit=${limit}`,
    { method: "GET" },
  );
  return parseJson(res);
}

export async function fetchTestsSummary(
  from?: string,
  to?: string,
): Promise<TestsSummaryDto> {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const qs = q.toString();
  const path = qs ? `/admin/analytics/tests-summary?${qs}` : `/admin/analytics/tests-summary`;
  const res = await adminApiFetch(path, { method: "GET" });
  return parseJson(res);
}

export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: n >= 100 ? 0 : 1,
  });
}

export function relativeTimeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  let sec = Math.round((Date.now() - then) / 1000);
  if (sec < 45) return "just now";
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))}m ago`;
  const hr = Math.round(sec / 3600);
  if (hr < 48) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}
