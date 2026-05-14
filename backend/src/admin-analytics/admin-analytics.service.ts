import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@generated/prisma/client";
import { PrismaService } from "src/prisma.service";

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

function parseRange(fromRaw?: string, toRaw?: string): { from: Date; to: Date } {
  const to = toRaw ? new Date(toRaw) : new Date();
  if (Number.isNaN(to.getTime())) {
    throw new BadRequestException("Invalid `to` date");
  }
  const from =
    fromRaw != null && fromRaw.trim() !== ""
      ? new Date(fromRaw)
      : new Date(to.getTime() - 30 * 86_400_000);
  if (Number.isNaN(from.getTime())) {
    throw new BadRequestException("Invalid `from` date");
  }
  return { from, to };
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    fromRaw?: string,
    toRaw?: string,
  ): Promise<AdminAnalyticsOverviewDto> {
    const { from, to } = parseRange(fromRaw, toRaw);

    const watchWhere = { endedAt: { gte: from, lte: to } };

    const [
      watchSumCount,
      watchersGroup,
      surveysCreated,
      surveysSubmitted,
      registrations,
      comprehensionAgg,
      comprehensionPassed,
      placements,
      totalUsers,
      totalContentVideos,
    ] = await Promise.all([
      this.prisma.watchSession.aggregate({
        where: watchWhere,
        _sum: { secondsWatched: true },
        _count: { id: true },
      }),
      this.prisma.watchSession.groupBy({
        by: ["userId"],
        where: watchWhere,
      }),
      this.prisma.postWatchSurvey.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.postWatchSurvey.count({
        where: {
          createdAt: { gte: from, lte: to },
          submittedAt: { not: null },
        },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.comprehensionTestAttempt.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _avg: { scorePct: true },
        _count: { id: true },
      }),
      this.prisma.comprehensionTestAttempt.count({
        where: {
          createdAt: { gte: from, lte: to },
          passed: true,
        },
      }),
      this.prisma.placementAttempt.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.user.count(),
      this.prisma.contentVideo.count(),
    ]);

    const seconds = watchSumCount._sum.secondsWatched ?? 0;
    const attempts = comprehensionAgg._count.id;
    const passRate =
      attempts > 0 ? (100 * comprehensionPassed) / attempts : null;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      watchHours: seconds / 3600,
      watchCompletionsInRange: watchSumCount._count.id,
      distinctWatchLearnersInRange: watchersGroup.length,
      surveySubmissionRatePct:
        surveysCreated > 0 ? (100 * surveysSubmitted) / surveysCreated : null,
      newRegistrationsInRange: registrations,
      totalUsers,
      totalContentVideos,
      comprehensionAttemptsInRange: attempts,
      comprehensionAvgScorePct:
        comprehensionAgg._avg.scorePct != null
          ? Math.round(comprehensionAgg._avg.scorePct * 10) / 10
          : null,
      comprehensionPassRatePct:
        passRate != null ? Math.round(passRate * 10) / 10 : null,
      placementCompletionsInRange: placements,
    };
  }

  async getUserGrowth(
    fromRaw?: string,
    toRaw?: string,
    granularity: "day" | "month" = "day",
  ): Promise<UserGrowthPointDto[]> {
    const { from, to } = parseRange(fromRaw, toRaw);
    const truncUnit =
      granularity === "month" ? Prisma.raw("'month'") : Prisma.raw("'day'");

    type Row = { bucket: Date; cnt: bigint };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT date_trunc(${truncUnit}, u."createdAt") AS bucket,
             COUNT(*)::bigint AS cnt
      FROM "users" u
      WHERE u."createdAt" >= ${from}
        AND u."createdAt" <= ${to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    let cumulative = await this.prisma.user.count({
      where: { createdAt: { lt: from } },
    });

    return rows.map((r) => {
      const n = Number(r.cnt);
      cumulative += n;
      return {
        periodStart: new Date(r.bucket).toISOString(),
        newUsers: n,
        cumulativeUsers: cumulative,
      };
    });
  }

  async getRecentActivity(
    limitRaw?: string,
  ): Promise<RecentActivityItemDto[]> {
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(limitRaw ?? "20", 10) || 20),
    );

    const slice = Math.min(30, limit);

    const [registrations, placements, watches, tests] = await Promise.all([
      this.prisma.user.findMany({
        take: slice,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, role: true, createdAt: true },
      }),
      this.prisma.placementAttempt.findMany({
        take: slice,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.watchSession.findMany({
        take: slice,
        orderBy: { endedAt: "desc" },
        include: {
          user: { select: { id: true, name: true } },
          contentVideo: { select: { id: true, videoName: true } },
        },
      }),
      this.prisma.comprehensionTestAttempt.findMany({
        take: slice,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true } },
          contentVideo: { select: { id: true, videoName: true } },
        },
      }),
    ]);

    type Merged = { at: Date; item: RecentActivityItemDto };
    const merged: Merged[] = [];

    for (const u of registrations) {
      merged.push({
        at: u.createdAt,
        item: {
          kind: "user_registered",
          at: u.createdAt.toISOString(),
          userId: u.id,
          userLabel: u.name ?? `User #${u.id}`,
          detail:
            u.role === "teacher"
              ? "Registered as teacher"
              : "New learner account",
        },
      });
    }

    for (const p of placements) {
      merged.push({
        at: p.createdAt,
        item: {
          kind: "placement_completed",
          at: p.createdAt.toISOString(),
          userId: p.userId,
          userLabel: p.user.name ?? `User #${p.userId}`,
          detail: `Placement → ${p.englishLevel} (${p.scorePct}% score)`,
        },
      });
    }

    for (const w of watches) {
      merged.push({
        at: w.endedAt,
        item: {
          kind: "watch_completed",
          at: w.endedAt.toISOString(),
          userId: w.userId,
          userLabel: w.user.name ?? `User #${w.userId}`,
          detail: `Finished “${w.contentVideo.videoName}”`,
        },
      });
    }

    for (const t of tests) {
      merged.push({
        at: t.createdAt,
        item: {
          kind: "comprehension_test_submitted",
          at: t.createdAt.toISOString(),
          userId: t.userId,
          userLabel: t.user.name ?? `User #${t.userId}`,
          detail: `Quiz on “${t.contentVideo.videoName}” — ${t.scorePct}%${t.passed ? " (pass)" : ""}`,
        },
      });
    }

    merged.sort((a, b) => b.at.getTime() - a.at.getTime());
    return merged.slice(0, limit).map((m) => m.item);
  }

  async getTestsSummary(
    fromRaw?: string,
    toRaw?: string,
  ): Promise<TestsSummaryDto> {
    const { from, to } = parseRange(fromRaw, toRaw);
    const agg = await this.prisma.comprehensionTestAttempt.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _avg: { scorePct: true },
      _count: { id: true },
    });
    const passed = await this.prisma.comprehensionTestAttempt.count({
      where: { createdAt: { gte: from, lte: to }, passed: true },
    });

    const attempts = agg._count.id;
    const passRatePct =
      attempts > 0 ? (100 * passed) / attempts : null;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      attempts,
      avgScorePct:
        agg._avg.scorePct != null
          ? Math.round(agg._avg.scorePct * 10) / 10
          : null,
      passRatePct:
        passRatePct != null ? Math.round(passRatePct * 10) / 10 : null,
    };
  }
}
