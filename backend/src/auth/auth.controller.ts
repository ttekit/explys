import { Controller, Post, Body, UseGuards, Get, Request, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WeeklyReviewService } from 'src/weekly-review/weekly-review.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegenerateStudyingPlanDto } from './dto/regenerate-studying-plan.dto';
import { AuthGuard } from './auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly weeklyReview: WeeklyReviewService,
  ) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({
    status: 400,
    description:
      'Bad request or unable to register with the provided information.',
  })
  @ApiBody({ type: RegisterDto })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiBody({ type: LoginDto })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile (requires authentication)' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@Request() req: any) {
    const userId = Number(req.user.sub);
    return this.authService.getProfile(userId);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('profile/regenerate-studying-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Regenerate saved studying plan (phases, pass conditions, weekly habits) from profile',
  })
  @ApiBody({ required: false, type: RegenerateStudyingPlanDto })
  @ApiResponse({ status: 200, description: 'Profile returned with updated plan JSON.' })
  regenerateStudyingPlan(
    @Request() req: any,
    @Body() body?: RegenerateStudyingPlanDto,
  ) {
    const userId = Number(req.user.sub);
    const locale = body?.locale === 'uk' ? 'uk' : 'en';
    return this.authService.regenerateStudyingPlan(userId, locale);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile/learning-stats')
  @ApiOperation({
    summary:
      'Learning dashboard stats (watch time, quizzes, Mon–Sun weekly activity UTC)',
  })
  @ApiResponse({ status: 200, description: 'Stats retrieved.' })
  getLearningStats(@Request() req: any) {
    const userId = Number(req.user.sub);
    return this.authService.getLearningStats(userId);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile/knowledge-tags')
  @ApiOperation({
    summary:
      'Topic-tag knowledge (listening / vocabulary / grammar means from UserLanguageData)',
  })
  @ApiResponse({ status: 200, description: 'Tag aggregates returned.' })
  getKnowledgeTags(@Request() req: any) {
    const userId = Number(req.user.sub);
    return this.authService.getKnowledgeTagProgress(userId);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile/vocabulary-progress')
  @ApiOperation({
    summary:
      'Saved vocabulary buckets for the learner’s study language (UserVocabulary mastery)',
  })
  @ApiResponse({ status: 200, description: 'Vocabulary aggregates returned.' })
  getVocabularyProgress(@Request() req: any) {
    const userId = Number(req.user.sub);
    return this.authService.getProfileVocabularyProgress(userId);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('weekly-review/tests')
  @ApiOperation({
    summary:
      'Weekly review quiz (MCQ) grounded in lessons watched this UTC week',
  })
  @ApiResponse({ status: 200, description: 'Tests payload or blocked reason.' })
  getWeeklyReviewTests(
    @Request() req: any,
    @Query('rerun') rerun?: string,
  ) {
    const userId = Number(req.user.sub);
    const practiceReplay =
      rerun === '1' ||
      (typeof rerun === 'string' && rerun.trim().toLowerCase() === 'true');
    return this.weeklyReview.generateTests(userId, { practiceReplay });
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('weekly-review/tests/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit weekly review answers (once per UTC week)' })
  @ApiResponse({ status: 200, description: 'Score and XP.' })
  submitWeeklyReview(
    @Request() req: any,
    @Body() body: { token: string; answers: Record<string, number | string> },
  ) {
    const userId = Number(req.user.sub);
    return this.weeklyReview.submit(userId, body);
  }
}
