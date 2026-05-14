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
  IsIn,
  IsInt,
  Min,
  Allow,
} from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must include at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(["adult", "student", "teacher"])
  role?: string;

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

  @IsOptional()
  @IsString()
  learningGoal?: string;

  @IsOptional()
  @IsString()
  timeToAchieve?: string;

  /** Full v2 object `{ version: 2, phases, weeklyHabits }`; validated in UsersService. */
  @IsOptional()
  @Allow()
  studyingPlanPhases?: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  activeStudyingPhaseIndex?: number;
}
