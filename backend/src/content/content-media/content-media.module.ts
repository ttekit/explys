import { Module } from '@nestjs/common';
import { ContentMediaService } from './content-media.service';
import { ContentMediaController } from './content-media.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ContentMediaController],
  providers: [ContentMediaService, PrismaService],
})
export class ContentMediaModule {}
