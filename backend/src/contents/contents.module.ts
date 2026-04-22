import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => [
        {
          ttl: Number(configService.getOrThrow("UPLOAD_RATE_TTL")),
          limit: Number(configService.getOrThrow("UPLOAD_RATE_LIMIT")),
        },
      ],
      inject: [ConfigService],
    }),
  ],
  controllers: [ContentsController],
  providers: [
    ContentsService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ContentsModule {}
