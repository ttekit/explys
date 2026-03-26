import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    englishLevel?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    hobbies?: string[];

    @IsOptional()
    @IsString()
    education?: string;

    @IsOptional()
    @IsString()
    workField?: string;

    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    favoriteGenres?: number[];

    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    hatedGenres?: number[];
}