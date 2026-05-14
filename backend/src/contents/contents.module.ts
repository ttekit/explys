import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "src/auth/auth.module";
import { ContentVideoModule } from "src/content/content-video/content-video.module";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";
import { RedisModule } from "@nestjs-modules/ioredis";

// TODO: Add GET /sitemap.xml (e.g. on ContentsController or a dedicated SEO controller)
// returning dynamic XML with all public lesson/content URLs from the Content entity
// (plus static routes like `/`, `/catalog`, `/pricing` as needed).
@Module({
  imports: [
    AuthModule,
    ContentVideoModule,
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => [
        {
          ttl: Number(configService.getOrThrow("UPLOAD_DATE_TTL")),
          limit: Number(configService.getOrThrow("UPLOAD_DATE_LIMIT")),
        },
      ],
      inject: [ConfigService],
    }),
    RedisModule.forRoot({
      type: "single",
      url: "redis://localhost:6379",
    }),
  ],
  controllers: [ContentsController],
  providers: [ContentsService],
})
export class ContentsModule {}
