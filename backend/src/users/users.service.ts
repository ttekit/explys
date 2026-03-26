import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    private userSelect = {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        additionalUserData: {
            select: {
                englishLevel: true,
                hobbies: true,
                education: true,
                workField: true,
                favoriteGenres: true,
                hatedGenres: true,
            }
        }
    };

    async create(createUserDto: CreateUserDto) {
        const { email, password, name, englishLevel, hobbies, education, workField, favoriteGenres, hatedGenres } = createUserDto;

        const userExist = await this.prisma.user.findUnique({ where: { email } });
        if (userExist) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        return this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                additionalUserData: {
                    create: {
                        englishLevel,
                        hobbies: hobbies || [],
                        education,
                        workField,
                        favoriteGenres: favoriteGenres && favoriteGenres.length > 0 ? {
                            connect: favoriteGenres.map(id => ({ id }))
                        } : undefined,
                        hatedGenres: hatedGenres && hatedGenres.length > 0 ? {
                            connect: hatedGenres.map(id => ({ id }))
                        } : undefined,
                    }
                }
            },
            select: this.userSelect,
        });
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
        await this.findOne(id);

        const { favoriteGenres, hatedGenres, englishLevel, hobbies, education, workField, ...dataToUpdate } = updateUserDto as any;

        if (dataToUpdate.password) {
            dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, 10);
        }

        const hasAdditionalDataUpdate = englishLevel !== undefined || hobbies !== undefined || education !== undefined || workField !== undefined || favoriteGenres !== undefined || hatedGenres !== undefined;

        return this.prisma.user.update({
            where: { id },
            data: {
                ...dataToUpdate,
                ...(hasAdditionalDataUpdate && {
                    additionalUserData: {
                        upsert: {
                            create: {
                                englishLevel,
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
                                hobbies,
                                education,
                                workField,
                                favoriteGenres: favoriteGenres ? {
                                    set: favoriteGenres.map((genreId: number) => ({ id: genreId }))
                                } : undefined,
                                hatedGenres: hatedGenres ? {
                                    set: hatedGenres.map((genreId: number) => ({ id: genreId }))
                                } : undefined,
                            }
                        }
                    }
                })
            },
            select: this.userSelect,
        });
    }

    async remove(id: number) {
        await this.findOne(id);

        return this.prisma.user.delete({
            where: { id },
            select: this.userSelect,
        });
    }
}