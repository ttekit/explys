import { AuthMethod } from "@generated/prisma/enums";
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
} from "class-validator";

export class CreateUserDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsString({ message: "Password must be a string" })
  //@IsNotEmpty()
  @MinLength(8, { message: "Password is too short (minimum 8 characters)" })
  @MaxLength(20, { message: "Password is too long (maximum 20 characters)" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must include at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  @IsOptional()
  @IsString({ message: "Picture URL must be a string" })
  picture?: string;

  @IsNotEmpty({ message: "Authentication method is required" })
  @IsString({ message: "Method must be a valid string" })
  method: AuthMethod;

  @IsString({ message: "Name must be a string" })
  @IsNotEmpty({ message: "Name is required" })
  name: string;

  @IsOptional()
  @IsString({ message: "English level must be a string" })
  englishLevel?: string;

  @IsOptional()
  @IsArray({ message: "Hobbies must be an array" })
  @IsString({ each: true, message: "Each hobby must be a string" })
  hobbies?: string[];

  @IsOptional()
  @IsString({ message: "Education must be a string" })
  education?: string;

  @IsOptional()
  @IsString({ message: "Work field must be a string" })
  workField?: string;

  @IsOptional()
  @IsArray({ message: "Favorite genres must be an array" })
  @IsNumber({}, { each: true, message: "Each genre ID must be a number" })
  favoriteGenres?: number[];

  @IsOptional()
  @IsArray({ message: "Hated genres must be an array" })
  @IsNumber({}, { each: true, message: "Each genre ID must be a number" })
  hatedGenres?: number[];

  @IsOptional()
  @IsString({ message: "Native language must be a string" })
  nativeLanguage?: string;

  @IsOptional()
  @IsArray({ message: "Known languages must be an array" })
  @IsString({ each: true, message: "Each language must be a string" })
  knownLanguages?: string[];

  @IsOptional()
  @IsArray({ message: "Known language levels must be an array" })
  @IsObject({
    each: true,
    message: "Each language level entry must be an object",
  })
  knownLanguageLevels?: Array<{ language: string; level: string }>;
}
