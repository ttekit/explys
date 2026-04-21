import { Module } from '@nestjs/common';
import { ContentsService } from './contents.service';
import { ContentsController } from './contents.controller';
import { PrismaService } from 'src/prisma.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
      ThrottlerModule.forRootAsync({
        useFactory: (configService: ConfigService) => [{
          ttl: configService.getOrThrow('UPLOAD_RATE_TTL'),
          limit: configService.getOrThrow('UPLOAD_DATE_LIMIT'), 
        },
      ],
      inject: [ConfigService],
    })
  ],
  controllers: [ContentsController],
  providers: [ContentsService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  }, PrismaService],
})
export class ContentsModule {}
