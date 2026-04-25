import { Module } from "@nestjs/common";
import { ContentVideoController } from "./content-video.controller";
import { ContentVideoService } from "./content-video.service";

@Module({
  controllers: [ContentVideoController],
  providers: [ContentVideoService],
})
export class ContentVideoModule {}
