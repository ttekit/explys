import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AlcorythmModule } from "./alcorythm/alcorythm.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { ContentMediaModule } from "./content/content-media/content-media.module";
import { ContentStatsModule } from "./content/content-stats/content-stats.module";
import { ContentVideoModule } from "./content-video/content-video.module";
import { ContentRecommendationsModule } from "./content-recommendations/content-recommendations.module";
import { ContentsModule } from "./contents/contents.module";
import { PrismaModule } from "./prisma.module";
import { TagsModule } from "./tags/tags.module";
import { TopicsModule } from "./topics/topics.module";
import { UsersModule } from "./users/users.module";
import { GlobalApiTokenGuard } from "./auth/global-api-token.guard";
import { RequireActiveSubscriptionGuard } from "./auth/guards/require-active-subscription.guard";
import { PhaseFinalTestModule } from "./phase-final-test/phase-final-test.module";
import { PlacementTestModule } from "./placement-test/placement-test.module";
import { AdminAnalyticsModule } from "./admin-analytics/admin-analytics.module";
import { AdminUsersModule } from "./admin-users/admin-users.module";
import { TeacherStudentsModule } from "./teacher-students/teacher-students.module";
import { BillingModule } from "./billing/billing.module";
import { LearnerRecapModule } from "./learner-recap/learner-recap.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { ProfileModule } from "./profile/profile.module";
import { RedisModule } from "./redis/redis.module";
import { SeoModule } from "./seo/seo.module";
import { AvatarsModule } from "./avatars/avatars.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ConstellationModule } from "./constelattions/constellation.module";
import { ChangelogModule } from './changelog/changelog.module';
import { SrsModule } from "./srs/srs.module";
import { RecommendationEngineModule } from "./recommendation-engine/recommendation-engine.module";
import { SlackQaModule } from "./slack-qa/slack-qa.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const defaultTtlSec = Number(
          configService.get("DEFAULT_RATE_TTL") ?? 60,
        );
        const defaultLimit = Number(
          configService.get("DEFAULT_RATE_LIMIT") ?? 1000,
        );
        const authTtl = Number(configService.get("AUTH_RATE_TTL") ?? 60_000);
        const authLimit = Number(configService.get("AUTH_RATE_LIMIT") ?? 10);
        const uploadTtlSec = Number(configService.get("UPLOAD_RATE_TTL") ?? 60);
        const uploadLimit = Number(
          configService.get("UPLOAD_RATE_LIMIT") ?? 10,
        );
        const geminiTtlSec = Number(configService.get("GEMINI_RATE_TTL") ?? 60);
        const geminiLimit = Number(
          configService.get("GEMINI_RATE_LIMIT") ?? 10,
        );
        return [
          {
            name: "default",
            ttl: defaultTtlSec * 1000,
            limit: defaultLimit,
          },
          { name: "auth", ttl: authTtl, limit: authLimit },
          {
            name: "upload",
            ttl: uploadTtlSec * 1000,
            limit: uploadLimit,
          },
          {
            name: "gemini",
            ttl: geminiTtlSec * 1000,
            limit: geminiLimit,
          },
        ];
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentsModule,
    ContentVideoModule,
    ContentRecommendationsModule,
    ContentStatsModule,
    ContentMediaModule,
    AlcorythmModule,
    TagsModule,
    CategoriesModule,
    TopicsModule,
    PlacementTestModule,
    PhaseFinalTestModule,
    AdminAnalyticsModule,
    AdminUsersModule,
    TeacherStudentsModule,
    BillingModule,
    LearnerRecapModule,
    LeaderboardModule,
    ProfileModule,
    RedisModule,
    SeoModule,
    AvatarsModule,
    ConstellationModule,
    ChangelogModule,
    SrsModule,
    RecommendationEngineModule,
    SlackQaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RequireActiveSubscriptionGuard },
    { provide: APP_GUARD, useClass: GlobalApiTokenGuard },
  ],
})
export class AppModule { }