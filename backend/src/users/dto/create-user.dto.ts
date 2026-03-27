import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsArray, IsNumber, IsObject } from 'class-validator';

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

    @IsOptional()
    @IsString()
    nativeLanguage?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    knownLanguages?: string[];

    @IsOptional()
    @IsArray()
    @IsObject({ each: true })
    knownLanguageLevels?: Array<{ language: string; level: string }>;
}