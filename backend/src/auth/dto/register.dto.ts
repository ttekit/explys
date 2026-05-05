import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  MinLength,
  IsNotEmpty,
  MaxLength,
  Validate,
} from "class-validator";
import { IsPasswordsMatchingConstraint } from "src/common/decorators/is-password-matching-constraint.decorator";

export class RegisterDto {
  @IsString({ message: "Email must be a string" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, {
    message: "Password is too short - minimum 8 characters required",
  })
  @MaxLength(20, {
    message: "Password is too long - maximum 20 characters allowed",
  })
  password: string;

  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, {
    message: "Password is too short - minimum 8 characters required",
  })
  @MaxLength(20, {
    message: "Password is too long - maximum 20 characters allowed",
  })
  @Validate(IsPasswordsMatchingConstraint, { message: "Password don`t match" })
  passwordRepeat: string;

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
