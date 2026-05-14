import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AlcorythmService } from '../alcorythm/alcorythm.service';
import {
  activeStudyingPhaseFromPassedLessons,
  phaseCountFromStoredPhases,
} from '../content-video/studying-plan-phase-progress.util';
import { StudyingPlanRegenerationService } from '../studying-plan/studying-plan-regeneration.service';

// Экспортируем интерфейс, чтобы контроллер мог его видеть
export interface GeneratedStudent {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly alcorythmService: AlcorythmService,
    private readonly studyingPlanRegeneration: StudyingPlanRegenerationService,
  ) { }

  async register(dto: RegisterDto) {
    const prisma = this.prisma as any;

    // Проверка существования пользователя
    const userExists = await prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (userExists) {
      throw new BadRequestException(
        'Unable to register with the provided information',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const trimmedLearningGoal =
      typeof dto.learningGoal === 'string' ? dto.learningGoal.trim() : '';
    const trimmedTimeToAchieve =
      typeof dto.timeToAchieve === 'string' ? dto.timeToAchieve.trim() : '';

    // ПОФИКШЕНО: Используем явную проверку && для сужения типа (Type Narrowing)
    const additionalDataPayload: any = {
      englishLevel: dto.englishLevel,
      education: dto.education,
      hobbies: dto.hobbies || [],
      workField: dto.workField,
      nativeLanguage: dto.nativeLanguage,
      knownLanguages: dto.knownLanguages || [],
      knownLanguageLevels: dto.knownLanguageLevels,
      teacherGrades: dto.teacherGrades,
      teacherTopics: dto.teacherTopics || [],
      studentGrade: dto.studentGrade,
      studentProblemTopics: dto.studentProblemTopics || [],
      studentNames: dto.studentNames, // Json массив из схемы [cite: 14]

      learningGoal: trimmedLearningGoal || null,
      timeToAchieve: trimmedTimeToAchieve || null,

      // Исправленная логика favoriteGenres
      favoriteGenres: (dto.favoriteGenres && dto.favoriteGenres.length > 0)
        ? { connect: dto.favoriteGenres.map(id => ({ id })) }
        : undefined,

      // Исправленная логика hatedGenres
      hatedGenres: (dto.hatedGenres && dto.hatedGenres.length > 0)
        ? { connect: dto.hatedGenres.map(id => ({ id })) }
        : undefined,
    };

    // 1. Создаем учителя (основного пользователя)
    const mainUser = await prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role || 'adult',
        additionalUserData: {
          create: additionalDataPayload,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const generatedStudents: GeneratedStudent[] = [];

    // 2. Генерация аккаунтов для учеников
    if (dto.role === 'teacher' && Array.isArray(dto.studentNames)) {
      for (const pupil of dto.studentNames) {
        // Генерация почты и временного пароля
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const studentEmail = `${pupil.name.toLowerCase()}.${pupil.surname.toLowerCase()}.${randomId}@alcorythm.com`;
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedStudentPassword = await bcrypt.hash(tempPassword, 10);

        // Создаем ученика и привязываем к учителю через teacherId 
        const newStudent = await prisma.user.create({
          data: {
            email: studentEmail,
            password: hashedStudentPassword,
            name: `${pupil.name} ${pupil.surname}`,
            role: 'student',
            teacherId: mainUser.id,
          },
        });

        generatedStudents.push({
          name: newStudent.name,
          email: studentEmail,
          password: tempPassword,
        });
      }
    }

    await this.alcorythmService.analyzeUserLevel(mainUser.id);

    const payload = { sub: mainUser.id, email: mainUser.email };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: mainUser.id,
        email: mainUser.email,
        name: mainUser.name,
      },
      // Возвращаем данные учеников учителю
      generatedStudents: generatedStudents.length > 0 ? generatedStudents : undefined,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        hasCompletedPlacement: true,
        isSuspended: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Account suspended');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasCompletedPlacement: user.hasCompletedPlacement,
      },
    };
  }

  async getProfile(userId: number) {
    const [user, passedLessons] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherId: true,
        hasCompletedPlacement: true,
        isSuspended: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        currentStreak: true,
        xp: true,
        level: true,
        achievements: { select: { achievementId: true, unlockedAt: true } },
        settings: {
          select: {
            playbackSpeed: true,
            currentResolution: true,
          },
        },
        additionalUserData: {
          select: {
            englishLevel: true,
            education: true,
            workField: true,
            nativeLanguage: true,
            hobbies: true,
            learningGoal: true,
            timeToAchieve: true,
            studyingPlanPhases: true,
            activePhaseEnteredAt: true,
            favoriteGenres: { select: { id: true } },
            hatedGenres: { select: { id: true } },
          },
        },
      },
    }),
      this.prisma.comprehensionTestAttempt.findMany({
        where: { userId, passed: true },
        distinct: ['contentVideoId'],
        select: { contentVideoId: true },
      }),
    ]);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isSuspended) {
      throw new ForbiddenException('Account suspended');
    }
    const extra = user.additionalUserData;
    const phaseCount = phaseCountFromStoredPhases(extra?.studyingPlanPhases, 4);
    const activeStudyingPhaseIndex = activeStudyingPhaseFromPassedLessons(
      passedLessons.length,
      phaseCount,
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherId: user.teacherId ?? null,
      hasCompletedPlacement: user.hasCompletedPlacement,
      currentStreak: user.currentStreak ?? 0,
      englishLevel: extra?.englishLevel ?? '',
      education: extra?.education ?? '',
      workField: extra?.workField ?? '',
      nativeLanguage: extra?.nativeLanguage ?? '',
      hobbies: extra?.hobbies ?? [],
      learningGoal: extra?.learningGoal ?? '',
      timeToAchieve: extra?.timeToAchieve ?? '',
      studyingPlanPhases: extra?.studyingPlanPhases ?? null,
      activePhaseEnteredAt:
        extra?.activePhaseEnteredAt != null ?
          extra.activePhaseEnteredAt.toISOString()
        : null,
      activeStudyingPhaseIndex,
      favoriteGenres: extra?.favoriteGenres?.map((g) => g.id) ?? [],
      hatedGenres: extra?.hatedGenres?.map((g) => g.id) ?? [],
      playbackSpeed: user.settings?.playbackSpeed ?? null,
      videoQuality: user.settings?.currentResolution ?? '',
      subscriptionPlan: user.subscriptionPlan ?? '',
      subscriptionStatus: user.subscriptionStatus ?? '',
      stripeSubscriptionId: user.stripeSubscriptionId ?? '',
      xp: user.xp,
      level: user.level,
      achievements: user.achievements.map((a: any) => a.achievementId),
    };
  }

  /** Rebuild phases, pass criteria, and weekly habits from profile (Gemini when configured). */
  async regenerateStudyingPlan(userId: number) {
    await this.studyingPlanRegeneration.regenerateForUser(userId);
    return this.getProfile(userId);
  }

  /** Monday 00:00 UTC through Sunday (current ISO week). */
  private utcWeekRange(): { weekStart: Date; weekEndExclusive: Date } {
    const now = new Date();
    const day = (d: Date) => d.getUTCDay();
    const x = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dow = day(x);
    const offset = dow === 0 ? -6 : 1 - dow;
    x.setUTCDate(x.getUTCDate() + offset);
    x.setUTCHours(0, 0, 0, 0);
    const weekEndExclusive = new Date(x);
    weekEndExclusive.setUTCDate(weekEndExclusive.getUTCDate() + 7);
    return { weekStart: x, weekEndExclusive };
  }

  /**
   * Dashboard numbers + weekly watch minutes (Mon–Sun, UTC week containing today).
   */
  async getLearningStats(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuspended: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isSuspended) {
      throw new ForbiddenException('Account suspended');
    }

    const [
      watchSum,
      distinctVideos,
      quizAgg,
      weekSessions,
    ] = await Promise.all([
      this.prisma.watchSession.aggregate({
        where: { userId },
        _sum: { secondsWatched: true },
      }),
      this.prisma.watchSession.findMany({
        where: { userId, completed: true },
        select: { contentVideoId: true },
        distinct: ['contentVideoId'],
      }),
      this.prisma.comprehensionTestAttempt.aggregate({
        where: { userId },
        _avg: { scorePct: true },
        _count: { _all: true },
      }),
      (() => {
        const { weekStart, weekEndExclusive } = this.utcWeekRange();
        return this.prisma.watchSession.findMany({
          where: {
            userId,
            endedAt: {
              gte: weekStart,
              lt: weekEndExclusive,
            },
          },
          select: { endedAt: true, secondsWatched: true },
        });
      })(),
    ]);

    const totalSeconds = watchSum?._sum?.secondsWatched ?? 0;
    const totalWatchTimeMin = Math.round(Number(totalSeconds) / 60);
    const videosCompleted = Array.isArray(distinctVideos)
      ? distinctVideos.length
      : 0;
    const testsCompleted = quizAgg?._count?._all ?? 0;
    const rawAvg = quizAgg?._avg?.scorePct;
    const averageScore =
      typeof rawAvg === 'number' && Number.isFinite(rawAvg)
        ? Math.round(rawAvg * 10) / 10
        : null;

    const minutesMonSun = [0, 0, 0, 0, 0, 0, 0];
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const s of weekSessions) {
      if (!s.endedAt) continue;
      const d = s.endedAt as Date;
      const utcDow = d.getUTCDay();
      const idx = utcDow === 0 ? 6 : utcDow - 1;
      minutesMonSun[idx] += Number(s.secondsWatched ?? 0) / 60;
    }

    const weeklyActivity = DAY_LABELS.map((day, i) => ({
      day,
      minutes: Math.ceil(minutesMonSun[i]),
    }));

    return {
      totalWatchTimeMin,
      videosCompleted,
      testsCompleted,
      averageScore,
      weeklyActivity,
    };
  }

  /**
   * Per-tag knowledge from `UserLanguageData`: each tag gets mean scores across
   * linked topics (listening, vocabulary, grammar, and aggregate `score`).
   */
  async getKnowledgeTagProgress(userId: number): Promise<{
    tags: Array<{
      name: string;
      score: number;
      listening: number;
      vocabulary: number;
      grammar: number;
      topicCount: number;
    }>;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuspended: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isSuspended) {
      throw new ForbiddenException('Account suspended');
    }

    const rows = await this.prisma.userLanguageData.findMany({
      where: { userId },
      include: {
        topic: { include: { tags: { select: { name: true } } } },
      },
    });

    const accum = new Map<
      string,
      { l: number; v: number; g: number; agg: number; n: number }
    >();

    for (const row of rows) {
      for (const tag of row.topic.tags) {
        const name = tag.name.trim();
        if (!name) {
          continue;
        }
        const cur = accum.get(name) ?? { l: 0, v: 0, g: 0, agg: 0, n: 0 };
        cur.l += row.listeningScore;
        cur.v += row.vocabularyScore;
        cur.g += row.grammarScore;
        cur.agg += row.score;
        cur.n += 1;
        accum.set(name, cur);
      }
    }

    const tags = [...accum.entries()]
      .map(([name, cur]) => {
        const n = cur.n;
        return {
          name,
          listening: Math.round((cur.l / n) * 1000) / 1000,
          vocabulary: Math.round((cur.v / n) * 1000) / 1000,
          grammar: Math.round((cur.g / n) * 1000) / 1000,
          score: Math.round((cur.agg / n) * 1000) / 1000,
          topicCount: cur.n,
        };
      })
      .sort((a, b) => b.score - a.score);

    return { tags };
  }
}