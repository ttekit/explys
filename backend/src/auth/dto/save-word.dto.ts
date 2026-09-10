import { IsOptional, IsString, MinLength } from "class-validator";

export class SaveWordDto {
  @IsString()
  @MinLength(1)
  term: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  translation?: string;

  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsString()
  pronunciation?: string;
}
