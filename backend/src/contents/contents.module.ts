import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";
import { RedisModule } from "@nestjs-modules/ioredis"

@Module({
  imports: [
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
      type: 'single',
      url: 'redis://localhost:6379'
    })
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
