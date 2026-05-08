import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { TeacherStudentsController } from './teacher-students.controller';
import { TeacherStudentsService } from './teacher-students.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherStudentsController],
  providers: [TeacherStudentsService],
})
export class TeacherStudentsModule {}
