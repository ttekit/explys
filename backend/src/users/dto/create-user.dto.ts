import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ description: 'The first name of the user', example: 'John' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'The email address of the user', example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'The user\'s password (minimum 6 characters)', example: 'securepassword123' })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    englishLevel?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    hobbies?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    education?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    workField?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    favoriteGenres?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    hatedGenres?: string;
}