import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiTokenOnlyGuard } from "src/auth/guards/api-token-only.guard";
import { AdminAnalyticsService } from "./admin-analytics.service";

@ApiTags("admin-analytics")
@Controller("admin/analytics")
@UseGuards(ApiTokenOnlyGuard)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalytics: AdminAnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "KPI snapshot for admin dashboards" })
  overview(
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.adminAnalytics.getOverview(from, to);
  }

  @Get("users-growth")
  @ApiOperation({
    summary: "New signups per bucket with running cumulative headcount",
  })
  usersGrowth(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("granularity") granularity?: "day" | "month",
  ) {
    const g =
      granularity === "month" ? "month" : ("day" as "day" | "month");
    return this.adminAnalytics.getUserGrowth(from, to, g);
  }

  @Get("recent-activity")
  @ApiOperation({ summary: "Mixed feed of registrations, watches, tests" })
  recentActivity(@Query("limit") limit?: string) {
    return this.adminAnalytics.getRecentActivity(limit);
  }

  @Get("tests-summary")
  @ApiOperation({ summary: "Comprehension test volume and score stats" })
  testsSummary(@Query("from") from?: string, @Query("to") to?: string) {
    return this.adminAnalytics.getTestsSummary(from, to);
  }
}
