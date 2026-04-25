import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RegisterStudentAccountDto } from './register-student-account.dto';
import { trimEmailInput } from './trim-helpers';

export class RegisterDto {
  @ApiProperty({ description: 'The first name of the user', example: 'John' })
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  name: string;

  @ApiProperty({ description: 'The email address of the user', example: 'john.doe@example.com' })
  @Transform(({ value }) => trimEmailInput(value))
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Password: 8–72 characters, at least one uppercase, one lowercase, and one digit',
    example: 'SecurePass1',
  })
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must include at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  teacherGrades?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teacherTopics?: string[];

  @IsString()
  @IsOptional()
  studentNames?: string;

  @IsString()
  @IsOptional()
  studentGrade?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  studentProblemTopics?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  englishLevel?: string;

  @ApiProperty({ required: false, type: [String], example: ['Reading', 'Gaming'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbies?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workField?: string;

  @ApiProperty({ required: false, type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  favoriteGenres?: number[];

  @ApiProperty({ required: false, type: [Number], example: [3, 4] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  hatedGenres?: number[];

  @ApiProperty({ required: false, example: 'uk' })
  @IsOptional()
  @IsString()
  nativeLanguage?: string;

  @ApiProperty({ required: false, type: [String], example: ['en', 'pl'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knownLanguages?: string[];

  @ApiProperty({
    required: false,
    type: [Object],
    example: [{ language: 'en', level: 'B2' }, { language: 'de', level: 'A2' }],
  })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  knownLanguageLevels?: Array<{ language: string; level: string }>;

  @ApiProperty({
    required: false,
    type: [RegisterStudentAccountDto],
    description:
      'When role is "teacher", optional list of student user accounts to create (same as roster download).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterStudentAccountDto)
  studentAccounts?: RegisterStudentAccountDto[];
}