import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiTokenOrJwtAuthGuard } from '../auth/guards/api-token-or-jwt.guard';
import { TeacherStudentsService } from './teacher-students.service';

type AuthedRequest = Request & {
  user?: { sub?: number };
  authViaApiToken?: boolean;
};

@ApiTags('teacher')
@Controller('teacher')
export class TeacherStudentsController {
  constructor(private readonly teacherStudentsService: TeacherStudentsService) {}

  @Get('my-students/results')
  @UseGuards(ApiTokenOrJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'List students assigned to this teacher with watch/quiz/placement summaries (JWT, teacher role only)',
  })
  @ApiResponse({ status: 200, description: 'Student results returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Not a teacher.' })
  async myStudentsResults(@Req() req: AuthedRequest) {
    if (req.authViaApiToken) {
      throw new ForbiddenException('Use a teacher login (JWT).');
    }
    const sub = req.user?.sub;
    const id = typeof sub === 'number' ? sub : Number(sub);
    if (!Number.isFinite(id)) {
      throw new ForbiddenException();
    }
    return this.teacherStudentsService.getMyStudentsResults(id);
  }
}
