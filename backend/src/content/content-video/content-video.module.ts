import { Module } from '@nestjs/common';
import { ContentVideoService } from './content-video.service';
import { ContentVideoController } from './content-video.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ContentVideoController],
  providers: [ContentVideoService, PrismaService],
})
export class ContentVideoModule {}
