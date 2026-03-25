import { Module } from '@nestjs/common';
import { ContentsService } from './contents.service';
import { ContentsController } from './contents.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ContentsController],
  providers: [ContentsService, PrismaService],
})
export class ContentsModule {}
