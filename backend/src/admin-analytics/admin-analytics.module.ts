import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { AdminAnalyticsController } from "./admin-analytics.controller";
import { AdminAnalyticsService } from "./admin-analytics.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
