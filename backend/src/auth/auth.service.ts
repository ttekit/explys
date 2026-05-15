import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AlcorythmService } from "../alcorythm/alcorythm.service";
import { UsersService } from "src/users/users.service";
import { AuthMethod, TokenType, User } from "@generated/prisma/client";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { ProviderService } from "./provider/provider.service";
import { EmailConfirmationService } from "./email-confirmation/email-confirmation.service";
import { TwoFactorAuthService } from "./two-factor-auth/two-factor-auth.service";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateEmailDto } from "./dto/update-email.dto";
import { isOutboundMailDisabled } from "src/common/utils/outbound-mail-disabled.util";

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
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
  ) {}

  private async filterExistingGenreIds(ids: number[] | undefined): Promise<number[]> {
    if (!ids?.length) {
      return [];
    }
    const numericUnique = [
      ...new Set(
        ids
          .map((raw) => {
            const n =
              typeof raw === "number" && Number.isFinite(raw)
                ? Math.trunc(raw)
                : parseInt(String(raw).trim(), 10);
            return Number.isFinite(n) && n > 0 ? n : NaN;
          })
          .filter((n): n is number => !Number.isNaN(n)),
      ),
    ];
    if (!numericUnique.length) {
      return [];
    }
    const rows = await this.prisma.genre.findMany({
      where: { id: { in: numericUnique } },
      select: { id: true },
    });
    return rows.map((g) => g.id);
  }

  private pickDefinedFields(
    record: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(record).filter(([, v]) => v !== undefined),
    );
  }

  async register(req: Request, dto: RegisterDto) {
    const prisma = this.prisma as any;
    const outboundMailDisabled = isOutboundMailDisabled(this.configService);

    const userExists = await this.userService.FindByEmail(
      dto.email.toLowerCase(),
    );

    if (userExists) {
      throw new ConflictException(
        "User with this email already exists. Please use another email or log in",
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const trimmedLearningGoal =
      typeof dto.learningGoal === "string" ? dto.learningGoal.trim() : "";
    const trimmedTimeToAchieve =
      typeof dto.timeToAchieve === "string" ? dto.timeToAchieve.trim() : "";

    const favoriteGenreIds = await this.filterExistingGenreIds(
      dto.favoriteGenres,
    );
    const hatedGenreIds = await this.filterExistingGenreIds(dto.hatedGenres);

    const additionalDataPayload: Record<string, unknown> = {
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
      studentNames: dto.studentNames,
      learningGoal: trimmedLearningGoal || null,
      timeToAchieve: trimmedTimeToAchieve || null,
    };
    const allowedRegisterRoles = new Set(["ADULT", "STUDENT", "TEACHER"]);
    const requestedRole = String(dto.role ?? "")
      .trim()
      .toUpperCase();
    const roleLabel = allowedRegisterRoles.has(requestedRole)
      ? requestedRole
      : "ADULT";
    const mainUser = await prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        name: dto.name,
        role: roleLabel as any,
        method: "CREDENTIALS",
        isVerified: outboundMailDisabled,
        additionalUserData: {
          create: this.pickDefinedFields(additionalDataPayload) as Record<
            string,
            unknown
          >,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    if (favoriteGenreIds.length > 0 || hatedGenreIds.length > 0) {
      const genreUpdate: Record<string, unknown> = {};
      if (favoriteGenreIds.length > 0) {
        genreUpdate.favoriteGenres = {
          connect: favoriteGenreIds.map((id) => ({ id })),
        };
      }
      if (hatedGenreIds.length > 0) {
        genreUpdate.hatedGenres = {
          connect: hatedGenreIds.map((id) => ({ id })),
        };
      }
      await prisma.additionalUserData.update({
        where: { userId: mainUser.id },
        data: genreUpdate as Record<string, unknown>,
      });
    }

    const generatedStudents: GeneratedStudent[] = [];

    // 2. Генерация аккаунтов для учеников
    // 2. Генерация аккаунтов для учеников
    if (dto.role === "teacher" && Array.isArray(dto.studentNames)) {
      for (const pupil of dto.studentNames) {
        const randomId = Math.floor(1000 + Math.random() * 9000);

        // Безопасно достаем данные, даже если это объект или строка
        let firstName = "student";
        let lastName = randomId.toString();

        if (typeof pupil === "object" && pupil !== null) {
          firstName = pupil.name || "student";
          lastName = pupil.surname || randomId.toString();
        } else if (typeof pupil === "string") {
          const parts = pupil.split(" ");
          firstName = parts[0] || "student";
          lastName = parts[1] || randomId.toString();
        }

        const studentEmail =
          `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randomId}@alcorythm.com`.replace(
            /\s+/g,
            "",
          );
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedStudentPassword = await bcrypt.hash(tempPassword, 10);

        await prisma.user.create({
          data: {
            email: studentEmail.toLowerCase(),
            password: hashedStudentPassword,
            name: `${firstName} ${lastName}`.trim(),
            role: "STUDENT",
            method: "CREDENTIALS",
            teacherId: mainUser.id,
            isVerified: outboundMailDisabled,
          },
        });

        generatedStudents.push({
          name: `${firstName} ${lastName}`.trim(),
          email: studentEmail,
          password: tempPassword,
        });
      }
    }
    await this.alcorythmService.analyzeUserLevel(mainUser.id);

    const payload = { sub: mainUser.id, email: mainUser.email };

    //await this.saveSession(req, mainUser);

    if (!outboundMailDisabled) {
      await this.emailConfirmationService.sendVerificationToken(mainUser);
    }

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: mainUser.id,
        email: mainUser.email,
        name: mainUser.name,
      },
      // Возвращаем данные учеников учителю
      generatedStudents:
        generatedStudents.length > 0 ? generatedStudents : undefined,
      message: outboundMailDisabled
        ? "You have successfully registered."
        : "You have successfully registered. Please confirm your email. A message has been sent to your mailing address.",
    };
  }

  public async confirmEmail(token: string) {
    // 1. Ищем токен в правильной таблице (Token), а не в User
    const existingToken = await this.prisma.token.findUnique({
      where: {
        token: token,
      },
    });

    // 2. Если токен не найден в базе
    if (!existingToken) {
      throw new BadRequestException(
        "Невірний або прострочений токен підтвердження",
      );
    }

    // 3. Ищем пользователя по email, который привязан к этому токену
    const user = await this.prisma.user.findUnique({
      where: {
        email: existingToken.email,
      },
    });

    if (!user) {
      throw new BadRequestException("Користувача не знайдено");
    }

    // 4. Обновляем статус пользователя на "Подтвержденный"
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        // verificationToken: null убрали, так как такого поля в User нет
      },
    });

    // 5. Удаляем сам токен из таблицы Token, чтобы его нельзя было юзать дважды
    await this.prisma.token.delete({
      where: { id: existingToken.id },
    });

    return { message: "Email успішно підтверджено" };
  }
  public async resendConfirmationEmail(email: string) {
    // 1. Шукаємо користувача в базі за email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException("Користувача з таким email не знайдено");
    }

    // 2. Перевіряємо, можливо він вже підтвердив пошту
    if (user.isVerified) {
      throw new BadRequestException(
        "Цей email вже підтверджено. Ви можете увійти в систему.",
      );
    }

    if (isOutboundMailDisabled(this.configService)) {
      throw new BadRequestException(
        "Підтвердження email поштою вимкнено на цьому сервері. Увійдіть у систему — обліковий запис буде активовано автоматично.",
      );
    }

    // 3. Генеруємо новий токен і відправляємо лист
    // (використовуємо той самий сервіс, що і при реєстрації)
    await this.emailConfirmationService.sendVerificationToken(user);

    return { message: "Новий лист підтвердження надіслано успішно" };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email.toLowerCase(),
      },
    });
    // const user = await this.prisma.user.findUnique({
    //   where: { email: dto.email },
    //   select: {
    //     id: true,
    //     email: true,
    //     name: true,
    //     password: true,
    //     isVerified: true,
    //     isTwoFactorEnable: true,
    //     role: true,
    //     hasCompletedPlacement: true,
    //     isSuspended: true,
    //   },
    // });

    if (!user || !user.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.isVerified) {
      if (isOutboundMailDisabled(this.configService)) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true },
        });
      } else {
        await this.emailConfirmationService.sendVerificationToken(user);
        throw new UnauthorizedException(
          "Email not verified. Please check your mail to confirm your account.",
        );
      }
    }

    if (user.isTwoFactorEnable) {
      if (!dto.code) {
        await this.twoFactorAuthService.sendTwoFactorToken(user.email);

        return {
          message:
            "Please check your email. Two-factor authentication code is required.",
        };
      }
      await this.twoFactorAuthService.validateTwoFactorToken(
        user.email,
        dto.code,
      );
    }

    if (user.isSuspended) {
      throw new ForbiddenException("Account suspended");
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

  async updatePassword(userId: number, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Неверный текущий пароль");
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    return { message: "Password successfully updated" };
  }
  async updateEmail(userId: number, dto: UpdateEmailDto) {
    // Проверяем, не занята ли почта
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.newEmail },
    });

    if (existingUser) {
      throw new BadRequestException("Email already in use");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email: dto.newEmail },
    });

    return { message: "Email updated successfully" };
  }

  public async extractProfileFromCode(
    req: Request,
    provider: string,
    code: string,
  ) {
    const providerInstance = this.providerService.findByService(provider);

    if (!providerInstance) {
      throw new NotFoundException(`Provider ${provider} not found`);
    }

    const profile = await providerInstance.findUserByCode(code);

    const account = await this.prisma.account.findFirst({
      where: {
        id: profile.id,
        provider: profile.provider,
      },
    });

    let user = account?.userId
      ? await this.userService.findById(account.userId)
      : null;

    if (user) {
      return this.saveSession(req, user);
    }

    user = await this.userService.create({
      email: profile.email,
      password: "",
      name: profile.name,
      picture: profile.picture,
      method: AuthMethod[profile.provider.toUpperCase()],
      //method: profile.provider.toUpperCase() as AuthMethod,
    });

    if (!account) {
      await this.prisma.account.create({
        data: {
          userId: user?.id,
          type: "oauth",
          provider: profile.provider,
          accessToken: profile.access_token,
          refreshToken: profile.refresh_token,
          expiresAt: profile.expires_at ?? 0,
        },
      });
    }
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return this.saveSession(req, user);
  }

  public async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              "'Could not end the session. Either the server is unreachable or the session is already invalid.'",
            ),
          );
        }
        res.clearCookie(this.configService.getOrThrow<string>("SESSION_NAME"));

        resolve();
      });
    });
  }

  public async saveSession(req: Request, user: Partial<User>) {
    return new Promise((resolve, reject) => {
      if (!user || !user.id) {
        throw new UnauthorizedException(
          "User not found or session data is missing",
        );
      }
      req.session.userId = user.id.toString();

      req.session.save((err) => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              "Failed to save session. Please check if session parameters are configured correctly.",
            ),
          );
        }
        resolve({
          user,
        });
      });
    });
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        role: true,
        hasCompletedPlacement: true,
        isSuspended: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        currentStreak: true,
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
            favoriteGenres: { select: { id: true } },
            hatedGenres: { select: { id: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.isSuspended) {
      throw new ForbiddenException("Account suspended");
    }
    const extra = user.additionalUserData;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
      hasCompletedPlacement: user.hasCompletedPlacement,
      currentStreak: user.currentStreak ?? 0,
      englishLevel: extra?.englishLevel ?? "",
      education: extra?.education ?? "",
      workField: extra?.workField ?? "",
      nativeLanguage: extra?.nativeLanguage ?? "",
      hobbies: extra?.hobbies ?? [],
      learningGoal: extra?.learningGoal ?? "",
      timeToAchieve: extra?.timeToAchieve ?? "",
      favoriteGenres: extra?.favoriteGenres?.map((g) => g.id) ?? [],
      hatedGenres: extra?.hatedGenres?.map((g) => g.id) ?? [],
      playbackSpeed: user.settings?.playbackSpeed ?? null,
      videoQuality: user.settings?.currentResolution ?? "",
      subscriptionPlan: user.subscriptionPlan ?? "",
      subscriptionStatus: user.subscriptionStatus ?? "",
      stripeSubscriptionId: user.stripeSubscriptionId ?? "",
    };
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
      throw new NotFoundException("User not found");
    }
    if (user.isSuspended) {
      throw new ForbiddenException("Account suspended");
    }

    const [watchSum, distinctVideos, quizAgg, weekSessions] = await Promise.all(
      [
        this.prisma.watchSession.aggregate({
          where: { userId },
          _sum: { secondsWatched: true },
        }),
        this.prisma.watchSession.findMany({
          where: { userId, completed: true },
          select: { contentVideoId: true },
          distinct: ["contentVideoId"],
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
      ],
    );

    const totalSeconds = watchSum?._sum?.secondsWatched ?? 0;
    const totalWatchTimeMin = Math.round(Number(totalSeconds) / 60);
    const videosCompleted = Array.isArray(distinctVideos)
      ? distinctVideos.length
      : 0;
    const testsCompleted = quizAgg?._count?._all ?? 0;
    const rawAvg = quizAgg?._avg?.scorePct;
    const averageScore =
      typeof rawAvg === "number" && Number.isFinite(rawAvg)
        ? Math.round(rawAvg * 10) / 10
        : null;

    const minutesMonSun = [0, 0, 0, 0, 0, 0, 0];
    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
      throw new NotFoundException("User not found");
    }
    if (user.isSuspended) {
      throw new ForbiddenException("Account suspended");
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
