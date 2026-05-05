import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AlcorythmService } from "../alcorythm/alcorythm.service";
import { UsersService } from "src/users/users.service";
import { User } from "@generated/prisma/client";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";

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
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
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

  async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          return reject(new InternalServerErrorException(""));
        }
        res.clearCookie(this.configService.getOrThrow<string>("SESSION_NAME"));
        
        resolve()
      });
    });
  }

  private async saveSession(req: Request, user: User) {
    return new Promise((resolve, reject) => {
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
