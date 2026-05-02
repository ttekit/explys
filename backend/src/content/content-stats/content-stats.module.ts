import { Module } from "@nestjs/common";
import { ContentStatsController } from "./content-stats.controller";
import { ContentStatsService } from "./content-stats.service";

@Module({
  controllers: [ContentStatsController],
  providers: [ContentStatsService],
})
export class ContentStatsModule {}
