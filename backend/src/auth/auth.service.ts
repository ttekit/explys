import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@generated/prisma/client';
import { RegisterDto } from './dto/register.dto';
import { RegisterStudentAccountDto } from './dto/register-student-account.dto';
import { LoginDto } from './dto/login.dto';
import { trimEmailInput } from './dto/trim-helpers';
import { AlcorythmService } from '../alcorythm/alcorythm.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly alcorythmService: AlcorythmService,
  ) { }

  private async createPupilUserAccounts(
    prisma: any,
    teacher: { id: number; email: string },
    accounts: RegisterStudentAccountDto[],
  ) {
    const tMail = (teacher.email || '').trim().toLowerCase();
    const normalized = accounts.map((a) => ({
      firstName: (a.firstName || '').trim(),
      lastName: (a.lastName || '').trim(),
      email: AuthService.normalizeEmail(a.email),
      password: (a.password || '').trim(),
    }));
    for (const s of normalized) {
      if (!s.firstName && !s.lastName) {
        throw new BadRequestException(
          'Each student in studentAccounts must have a first or last name',
        );
      }
      if (!s.email) {
        throw new BadRequestException(
          'Each student in studentAccounts must have a valid email',
        );
      }
    }
    const emails = normalized.map((s) => s.email).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      throw new BadRequestException('Duplicate student emails in studentAccounts');
    }
    if (emails.includes(tMail)) {
      throw new BadRequestException(
        'A student email cannot be the same as the teacher email',
      );
    }
    if (emails.length) {
      const taken = await prisma.user.findFirst({
        where: {
          OR: emails.map((e) => ({
            email: { equals: e, mode: 'insensitive' as const },
          })),
        },
        select: { email: true },
      });
      if (taken) {
        throw new BadRequestException(
          `This email is already registered: ${taken.email}`,
        );
      }
    }

    const createAdditional = () => ({
      hobbies: [],
      knownLanguages: [],
      interests: [],
      teacherTopics: [],
      studentProblemTopics: [],
    });

    for (const s of normalized) {
      const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
      const name = fullName || s.email;
      const passwordHash = await bcrypt.hash(s.password, 10);
      const created = await prisma.user.create({
        data: {
          email: s.email,
          password: passwordHash,
          name,
          role: 'student',
          teacherId: teacher.id,
          additionalUserData: {
            create: createAdditional(),
          },
        },
        select: { id: true },
      });
      await this.alcorythmService.analyzeUserLevel(created.id);
    }
  }

  private static normalizeEmail(e: string): string {
    return trimEmailInput(e);
  }

  async register(dto: RegisterDto) {
    const prisma = this.prisma as any;

    if (
      dto.studentAccounts?.length &&
      (dto.role || 'adult') !== 'teacher'
    ) {
      throw new BadRequestException(
        'studentAccounts is only allowed when role is teacher',
      );
    }

    const email = AuthService.normalizeEmail(dto.email);
    if (!email) {
      throw new BadRequestException('A valid email is required');
    }

    const userExists = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true },
    });

    if (userExists) {
      throw new BadRequestException(
        'An account with this email is already registered. Log in or use a different email.',
      );
    }

    const passwordPlain = (dto.password ?? '').trim();
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);

    let user: { id: number; email: string; name: string };

    // Формуємо об'єкт з додатковими даними, включаючи нові поля для ролей
    const additionalDataPayload: any = {
      englishLevel: dto.englishLevel,
      education: dto.education,
      hobbies: dto.hobbies || [],
      workField: dto.workField,
      nativeLanguage: dto.nativeLanguage,
      knownLanguages: dto.knownLanguages || [],
      knownLanguageLevels: dto.knownLanguageLevels,

      // Нові поля залежно від ролі:
      teacherGrades: dto.teacherGrades,
      teacherTopics: dto.teacherTopics || [],
      studentNames: dto.studentNames,
      studentGrade: dto.studentGrade,
      studentProblemTopics: dto.studentProblemTopics || [],

      favoriteGenres: dto.favoriteGenres && dto.favoriteGenres.length > 0 ? {
        connect: dto.favoriteGenres.map(id => ({ id }))
      } : undefined,
      hatedGenres: dto.hatedGenres && dto.hatedGenres.length > 0 ? {
        connect: dto.hatedGenres.map(id => ({ id }))
      } : undefined,
    };

    const createTeacherData = () => ({
      email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role || 'adult', // Зберігаємо базову роль
      additionalUserData: {
        create: additionalDataPayload,
      },
    });

    try {
      user = await prisma.user.create({
        data: createTeacherData(),
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002' && /email/i.test(String(error?.meta?.target ?? ''))) {
        throw new BadRequestException(
          'An account with this email is already registered. Log in or use a different email.',
        );
      }
      const message = String(error?.message ?? '');
      if (message.includes('Unknown argument `knownLanguages`')) {
        delete additionalDataPayload.knownLanguages;
      }
      if (message.includes('Unknown argument `knownLanguageLevels`')) {
        delete additionalDataPayload.knownLanguageLevels;
      }

      if (message.includes('Unknown argument `knownLanguages`') || message.includes('Unknown argument `knownLanguageLevels`')) {
        try {
        user = await prisma.user.create({
          data: createTeacherData(),
          select: {
            id: true,
            email: true,
            name: true,
          },
        });
        } catch (e2: any) {
          if (e2?.code === 'P2002') {
            throw new BadRequestException(
              'An account with this email is already registered. Log in or use a different email.',
            );
          }
          throw e2;
        }
        await this.alcorythmService.analyzeUserLevel(user.id);
        if (dto.studentAccounts?.length) {
          await this.createPupilUserAccounts(prisma, user, dto.studentAccounts);
        }
        const payload = { sub: user.id, email: user.email };
        return {
          access_token: await this.jwtService.signAsync(payload),
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        };
      }

      // Backward compatibility if additional_user_data table is not yet migrated.
      if (error?.code !== 'P2021') {
        throw error;
      }

      try {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: dto.name,
          role: dto.role || 'adult', // Зберігаємо базову роль навіть якщо немає additionalUserData
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
      } catch (e3: any) {
        if (e3?.code === 'P2002') {
          throw new BadRequestException(
            'An account with this email is already registered. Log in or use a different email.',
          );
        }
        throw e3;
      }
    }

    await this.alcorythmService.analyzeUserLevel(user.id);
    if (dto.studentAccounts?.length) {
      await this.createPupilUserAccounts(prisma, user, dto.studentAccounts);
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    };
  }

  async login(dto: LoginDto) {
    const email = AuthService.normalizeEmail(dto.email);
    if (!email) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // LOWER() lookup works for any casing in DB; avoids Prisma "insensitive" edge cases.
    const rows = await this.prisma.$queryRaw<
      { id: number; email: string; name: string; password: string }[]
    >(
      Prisma.sql`SELECT "id", "email", "name", "password" FROM "users" WHERE LOWER(TRIM("email")) = ${email} LIMIT 1`,
    );
    const user = rows[0] ?? null;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordPlain = (dto.password ?? '').trim();
    const isPasswordValid = await bcrypt.compare(passwordPlain, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    };
  }
}