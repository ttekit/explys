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

  @IsString({ message: "Name must be a valid string" })
  name: string;

  @IsOptional()
  @IsString({ message: "Role must be a string" })
  role?: string;

  @IsOptional()
  @IsArray({ message: "Student names must be an array" })
  studentNames?: any;

  @IsOptional()
  @IsString({ message: "Teacher grades must be a string" })
  teacherGrades?: string;

  @IsOptional()
  @IsArray({ message: "Teacher topics must be an array" })
  teacherTopics?: string[];

  @IsOptional()
  @IsString({ message: "English level must be a valid string" })
  englishLevel?: string;

  @IsOptional()
  @IsString({ message: "Education info must be a string" })
  education?: string;

  @IsOptional()
  @IsArray({ message: "Hobbies must be an array of strings" })
  hobbies?: string[];

  @IsOptional()
  @IsString({ message: "Work field must be a string" })
  workField?: string;

  @IsOptional()
  @IsString({ message: "Native language must be a string" })
  nativeLanguage?: string;

  @IsOptional()
  @IsArray({ message: "Known languages must be an array" })
  knownLanguages?: string[];

  @IsOptional()
  knownLanguageLevels?: any;

  @IsOptional()
  @IsString({ message: "Student grade must be a string" })
  studentGrade?: string;

  @IsOptional()
  @IsArray({ message: "Problem topics must be an array" })
  studentProblemTopics?: string[];

  @IsOptional()
  @IsArray({ message: "Favorite genres must be an array of IDs" })
  favoriteGenres?: number[];

  @IsOptional()
  @IsArray({ message: "Hated genres must be an array of IDs" })
  hatedGenres?: number[];

  /** Adult: main motivation / destination (e.g. travel to GB). */
  @IsOptional()
  @IsString()
  learningGoal?: string;

  /** Adult: target time horizon (e.g. 3m). */
  @IsOptional()
  @IsString()
  timeToAchieve?: string;
}
