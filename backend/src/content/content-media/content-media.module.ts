import { Module } from "@nestjs/common";
import { ContentMediaController } from "./content-media.controller";
import { ContentMediaService } from "./content-media.service";

@Module({
  controllers: [ContentMediaController],
  providers: [ContentMediaService],
})
export class ContentMediaModule {}
