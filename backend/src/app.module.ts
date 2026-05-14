import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AlcorythmModule } from "./alcorythm/alcorythm.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { ContentMediaModule } from "./content/content-media/content-media.module";
import { ContentStatsModule } from "./content/content-stats/content-stats.module";
import { ContentVideoModule } from "./content/content-video/content-video.module";
import { ContentsModule } from "./contents/contents.module";
import { TagsModule } from "./tags/tags.module";
import { TopicsModule } from "./topics/topics.module";
import { UsersModule } from "./users/users.module";
import { GlobalApiTokenGuard } from "./auth/global-api-token.guard";
import { RequireActiveSubscriptionGuard } from "./auth/guards/require-active-subscription.guard";
import { PlacementTestModule } from "./placement-test/placement-test.module";
import { IS_DEV_ENV } from "./common/utils/is-dev.utils";
import { PrismaModule } from './prisma/prisma.module';
import { ProviderModule } from './auth/provider/provider.module';
import { MailModule } from './common/mail/mail.module';
import { EmailConfirmationModule } from './auth/email-confirmation/email-confirmation.module';
import { PasswordRecoveryModule } from './auth/password-recovery/password-recovery.module';
import { TwoFactorAuthModule } from './auth/two-factor-auth/two-factor-auth.module';
import { AdminAnalyticsModule } from "./admin-analytics/admin-analytics.module";
import { AdminUsersModule } from "./admin-users/admin-users.module";
import { TeacherStudentsModule } from "./teacher-students/teacher-students.module";
import { BillingModule } from "./billing/billing.module";
import { ContentRecommendationsModule } from "./content-recommendations/content-recommendations.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      //ignoreEnvFile: !IS_DEV_ENV,
      isGlobal: true,
      envFilePath: '.env'
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentsModule,
    ContentVideoModule,
    ContentStatsModule,
    ContentMediaModule,
    AlcorythmModule,
    TagsModule,
    CategoriesModule,
    TopicsModule,
    PlacementTestModule,
    ProviderModule,
    MailModule,
    EmailConfirmationModule,
    PasswordRecoveryModule,
    TwoFactorAuthModule,
    AdminAnalyticsModule,
    AdminUsersModule,
    TeacherStudentsModule,
    BillingModule,
    ContentRecommendationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: RequireActiveSubscriptionGuard },
    { provide: APP_GUARD, useClass: GlobalApiTokenGuard },
  ],
})
export class AppModule { }
