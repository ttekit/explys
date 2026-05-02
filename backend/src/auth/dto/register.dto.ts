import { IsEmail, IsString, IsOptional, IsArray, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsArray()
  studentNames?: any;

  @IsOptional()
  @IsString()
  teacherGrades?: string;

  @IsOptional()
  @IsArray()
  teacherTopics?: string[];

  @IsOptional()
  @IsString()
  englishLevel?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsArray()
  hobbies?: string[];

  @IsOptional()
  @IsString()
  workField?: string;

  @IsOptional()
  @IsString()
  nativeLanguage?: string;

  @IsOptional()
  @IsArray()
  knownLanguages?: string[];

  @IsOptional()
  knownLanguageLevels?: any;

  @IsOptional()
  @IsString()
  studentGrade?: string;

  @IsOptional()
  @IsArray()
  studentProblemTopics?: string[];

  @IsOptional()
  @IsArray()
  favoriteGenres?: number[];

  @IsOptional()
  @IsArray()
  hatedGenres?: number[];
}