import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AlcorythmService } from "../alcorythm/alcorythm.service";
import { UsersService } from "src/users/users.service";
import { AuthMethod, User } from "@generated/prisma/client";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { ProviderService } from "./provider/provider.service";
import { EmailConfirmationService } from "./email-confirmation/email-confirmation.service";

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
  ) {}

  async register(req: Request, dto: RegisterDto) {
    const prisma = this.prisma as any;

    const userExists = await this.userService.FindByEmail(dto.email);

    if (userExists) {
      throw new ConflictException(
        "User with this email already exists. Please use another email or log in",
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

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

      // Исправленная логика favoriteGenres
      favoriteGenres:
        dto.favoriteGenres && dto.favoriteGenres.length > 0
          ? { connect: dto.favoriteGenres.map((id) => ({ id })) }
          : undefined,

      // Исправленная логика hatedGenres
      hatedGenres:
        dto.hatedGenres && dto.hatedGenres.length > 0
          ? { connect: dto.hatedGenres.map((id) => ({ id })) }
          : undefined,
    };

    // 1. Создаем учителя (основного пользователя)
    const mainUser = await prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: (dto.role?.toUpperCase() || "ADULT") as any,
        method: "CREDENTIALS",
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
    if (dto.role === "teacher" && Array.isArray(dto.studentNames)) {
      for (const pupil of dto.studentNames) {
        // Генерация почты и временного пароля
        const randomId = Math.floor(1000 + Math.random() * 9000);

        const [name, surname] = pupil.split(" ");
        const studentEmail = `${name?.toLowerCase()}.${surname?.toLowerCase()}.${randomId}@alcorythm.com`;
        //const studentEmail = `${pupil.name.toLowerCase()}.${pupil.surname.toLowerCase()}.${randomId}@alcorythm.com`;
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedStudentPassword = await bcrypt.hash(tempPassword, 10);

        // Создаем ученика и привязываем к учителю через teacherId
        const newStudent = await prisma.user.create({
          data: {
            email: studentEmail,
            password: hashedStudentPassword,
            name: pupil,
            role: "STUDENT",
            method: "CREDENTIALS",
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

    await this.saveSession(req, mainUser);

    await this.emailConfirmationService.sendVerificationToken(mainUser);
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
      message:
        "You have successfully registered. Please confirm your email. A message has been sent to your mailing address.",
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
        isVerified: true,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isVerified) {
      await this.emailConfirmationService.sendVerificationToken(user as any);
      throw new UnauthorizedException(
        "Email not verified. Please check your mail to confirm your account.",
      );
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
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
          return reject(new InternalServerErrorException(""));
        }
        res.clearCookie(this.configService.getOrThrow<string>("SESSION_NAME"));

        resolve();
      });
    });
  }

  public async saveSession(req: Request, user: Partial<User>) {
    return new Promise((resolve, reject) => {
      if (!user || !user.id) {
        throw new UnauthorizedException(" ");
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
}
