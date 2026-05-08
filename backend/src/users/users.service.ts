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
        isSuspended: true,
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
        settings: {
            select: {
                playbackSpeed: true,
                currentResolution: true,
            },
        },
    };

    async create(createUserDto: CreateUserDto) {
        const prisma = this.prisma as any;
        const {
            email,
            password,
            name,
            role: roleRaw,
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
        const role =
            roleRaw &&
                ["adult", "student", "teacher"].includes(roleRaw)
                ? roleRaw
                : undefined;
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

        const hashedPassword = await bcrypt.hash(password, 10);

        let created: any;
        try {
            created = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    ...(role ? { role } : {}),
                    additionalUserData: {
                        create: additionalDataPayload,
                    },
                },
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
                    data: {
                        email,
                        password: hashedPassword,
                        name,
                        ...(role ? { role } : {}),
                        additionalUserData: { create: additionalDataPayload },
                    },
                    select: this.userSelect,
                });
                await this.alcorythmService.analyzeUserLevel(created.id);
                return created;
            }

            if (error?.code !== 'P2021') {
                throw error;
            }

            created = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    ...(role ? { role } : {}),
                },
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

    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: this.userSelect,
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const prisma = this.prisma as any;
        await this.findOne(id);

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
            playbackSpeed,
            currentResolution,
            ...dataToUpdate
        } = updateUserDto as any;

        if (
            dataToUpdate.password !== undefined &&
            dataToUpdate.password !== null &&
            String(dataToUpdate.password).trim() !== ''
        ) {
            dataToUpdate.password = await bcrypt.hash(
                String(dataToUpdate.password),
                10,
            );
        } else {
            delete dataToUpdate.password;
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

        const hasSettingsRowUpdate =
            playbackSpeed !== undefined || currentResolution !== undefined;

        const settingsUpsert =
            hasSettingsRowUpdate
                ? {
                    settings: {
                        upsert: {
                            create: {
                                playbackSpeed:
                                    playbackSpeed === undefined
                                        ? null
                                        : Number(playbackSpeed),
                                currentResolution:
                                    currentResolution === undefined
                                        ? null
                                        : String(currentResolution),
                            },
                            update: {
                                ...(playbackSpeed !== undefined
                                    ? {
                                        playbackSpeed:
                                            Number(playbackSpeed),
                                    }
                                    : {}),
                                ...(currentResolution !== undefined
                                    ? {
                                        currentResolution:
                                            String(currentResolution),
                                    }
                                    : {}),
                            },
                        },
                    },
                }
                : {};

        let updatedUser: any;
        try {
            updatedUser = await prisma.user.update({
                where: { id },
                data: {
                    ...dataToUpdate,
                    ...settingsUpsert,
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
                    ...settingsUpsert,
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
        await this.findOne(id);

        return this.prisma.user.delete({
            where: { id },
            select: this.userSelect,
        });
    }


    async updateActivityStreak(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { currentStreak: true, lastActivityDate: true }
        });

        if (!user) return null;

        const now = new Date();
        // Приводимо сьогоднішню дату до півночі по UTC для точного порівняння
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        let newStreak = user.currentStreak;

        if (!user.lastActivityDate) {
            // Перша активність в історії
            newStreak = 1;
        } else {
            const lastActivity = new Date(user.lastActivityDate);
            const lastActivityDay = new Date(Date.UTC(lastActivity.getUTCFullYear(), lastActivity.getUTCMonth(), lastActivity.getUTCDate()));

            // Різниця в днях
            const diffTime = today.getTime() - lastActivityDay.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Вже вивчав сьогодні, стрік не міняємо, просто оновимо час останньої активності
                return this.prisma.user.update({
                    where: { id: userId },
                    data: { lastActivityDate: now }
                });
            } else if (diffDays === 1) {
                // Вивчав вчора, продовжуємо стрік
                newStreak += 1;
            } else {
                // Пропустив день (або більше), стрік скидається
                newStreak = 1;
            }
        }

        // Оновлюємо базу
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                currentStreak: newStreak,
                lastActivityDate: now,
            }
        });
    }
}