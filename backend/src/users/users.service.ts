import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { AlcorythmService } from '../alcorythm/alcorythm.service';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly alcorythmService: AlcorythmService,
    ) { }

    private readonly userSelect = {
        id: true,
        name: true,
        email: true,
        role: true,
        hasCompletedPlacement: true,
        createdAt: true,
        additionalUserData: {
            select: {
                englishLevel: true,
                nativeLanguage: true,
                knownLanguages: true,
                knownLanguageLevels: true,
                hobbies: true,
                education: true,
                workField: true,
                job: true,
                interests: true,
                teacherGrades: true,
                teacherTopics: true,
                studentNames: true,
                studentGrade: true,
                studentProblemTopics: true,
                favoriteGenres: true,
                hatedGenres: true,
            },
        },
    };

    async create(createUserDto: CreateUserDto) {
        const prisma = this.prisma as any;
        const {
            email,
            password,
            name,
            englishLevel,
            hobbies,
            education,
            workField,
            favoriteGenres,
            hatedGenres,
            nativeLanguage,
            knownLanguages,
            knownLanguageLevels,
        } = createUserDto;
        const additionalDataPayload: any = {
            englishLevel,
            nativeLanguage,
            knownLanguages: knownLanguages || [],
            knownLanguageLevels,
            hobbies: hobbies || [],
            education,
            workField,
            favoriteGenres: favoriteGenres && favoriteGenres.length > 0 ? {
                connect: favoriteGenres.map(id => ({ id }))
            } : undefined,
            hatedGenres: hatedGenres && hatedGenres.length > 0 ? {
                connect: hatedGenres.map(id => ({ id }))
            } : undefined,
        };

        const userExist = await prisma.user.findUnique({ where: { email } });
        if (userExist) {
            throw new BadRequestException(
                "Unable to create user with the provided information",
            );
        }

        let hashedPassword = null;

        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const userData: any = {
            email,
            name,
            method: createUserDto.method,
            additionalUserData: {
                create: additionalDataPayload,
            },
        }
        if(hashedPassword){
            userData.password = hashedPassword;
        }

        let created: any;
        try {
            created = await prisma.user.create({
                data: userData,
                select: this.userSelect,
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
                created = await prisma.user.create({
                    data: userData,
                    select: this.userSelect,
                });
                await this.alcorythmService.analyzeUserLevel(created.id);
                return created;
            }

            if (error?.code !== 'P2021') {
                throw error;
            }

            created = await prisma.user.create({
                data: { email, password: hashedPassword, name },
                select: this.userSelect,
            });
        }

        await this.alcorythmService.analyzeUserLevel(created.id);
        return created;
    }

    async findAll() {
        return this.prisma.user.findMany({
            select: this.userSelect,
        });
    }

    async findById(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: this.userSelect,
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }
    async FindByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email
            },
            include: {
                accounts: true,
            }
        })
        return user
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const prisma = this.prisma as any;
        await this.findById(id);

        const {
            favoriteGenres,
            hatedGenres,
            englishLevel,
            hobbies,
            education,
            workField,
            nativeLanguage,
            knownLanguages,
            knownLanguageLevels,
            ...dataToUpdate
        } = updateUserDto as any;

        if (dataToUpdate.password) {
            dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, 10);
        }

        const hasProfileUpdate =
            englishLevel !== undefined ||
            hobbies !== undefined ||
            education !== undefined ||
            workField !== undefined ||
            nativeLanguage !== undefined ||
            knownLanguages !== undefined ||
            knownLanguageLevels !== undefined ||
            favoriteGenres !== undefined ||
            hatedGenres !== undefined;

        let updatedUser: any;
        try {
            updatedUser = await prisma.user.update({
                where: { id },
                data: {
                    ...dataToUpdate,
                    ...(hasProfileUpdate ? {
                        additionalUserData: {
                            upsert: {
                                create: {
                                    englishLevel,
                                    nativeLanguage,
                                    knownLanguages: knownLanguages || [],
                                    knownLanguageLevels,
                                    hobbies: hobbies || [],
                                    education,
                                    workField,
                                    favoriteGenres: favoriteGenres ? {
                                        connect: favoriteGenres.map((genreId: number) => ({ id: genreId }))
                                    } : undefined,
                                    hatedGenres: hatedGenres ? {
                                        connect: hatedGenres.map((genreId: number) => ({ id: genreId }))
                                    } : undefined,
                                },
                                update: {
                                    englishLevel,
                                    nativeLanguage,
                                    knownLanguages,
                                    knownLanguageLevels,
                                    hobbies,
                                    education,
                                    workField,
                                    favoriteGenres: favoriteGenres ? {
                                        set: favoriteGenres.map((genreId: number) => ({ id: genreId }))
                                    } : undefined,
                                    hatedGenres: hatedGenres ? {
                                        set: hatedGenres.map((genreId: number) => ({ id: genreId }))
                                    } : undefined,
                                },
                            },
                        },
                    } : {}),
                },
                select: this.userSelect,
            });
        } catch (error: any) {
            if (error?.code !== 'P2021') {
                throw error;
            }

            updatedUser = await prisma.user.update({
                where: { id },
                data: {
                    ...dataToUpdate,
                },
                select: this.userSelect,
            });
        }

        if (hasProfileUpdate) {
            await this.alcorythmService.analyzeUserLevel(id);
        }

        return updatedUser;
    }

    async remove(id: number) {
        await this.findById(id);

        return this.prisma.user.delete({
            where: { id },
            select: this.userSelect,
        });
    }
}