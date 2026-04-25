import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AlcorythmService } from '../alcorythm/alcorythm.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly alcorythmService: AlcorythmService,
  ) { }

  async register(dto: RegisterDto) {
    const prisma = this.prisma as any;

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

    let user: { id: number; email: string; name: string };
    const additionalDataPayload: any = {
      englishLevel: dto.englishLevel,
      education: dto.education,
      hobbies: dto.hobbies || [],
      workField: dto.workField,
      nativeLanguage: dto.nativeLanguage,
      knownLanguages: dto.knownLanguages || [],
      knownLanguageLevels: dto.knownLanguageLevels,
      favoriteGenres: dto.favoriteGenres && dto.favoriteGenres.length > 0 ? {
        connect: dto.favoriteGenres.map(id => ({ id }))
      } : undefined,
      hatedGenres: dto.hatedGenres && dto.hatedGenres.length > 0 ? {
        connect: dto.hatedGenres.map(id => ({ id }))
      } : undefined,
    };
    try {
      user = await prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
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
    } catch (error: any) {
      const message = String(error?.message ?? '');
      if (message.includes('Unknown argument `knownLanguages`')) {
        delete additionalDataPayload.knownLanguages;
      }
      if (message.includes('Unknown argument `knownLanguageLevels`')) {
        delete additionalDataPayload.knownLanguageLevels;
      }

      if (message.includes('Unknown argument `knownLanguages`') || message.includes('Unknown argument `knownLanguageLevels`')) {
        user = await prisma.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            name: dto.name,
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
        await this.alcorythmService.analyzeUserLevel(user.id);
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

      user = await prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }

    await this.alcorythmService.analyzeUserLevel(user.id);

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
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

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