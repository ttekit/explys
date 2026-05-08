import { Transform } from "class-transformer";
import { IsString, MinLength, Matches, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { trimEmailInput } from "./trim-helpers";

export class LoginDto {
  @ApiProperty({
    description:
      "Login address (any casing). Supports internal addresses e.g. name@class.local",
    example: "john.doe@example.com",
  })
  @Transform(({ value }) => trimEmailInput(value))
  @IsString({ message: "Email must be a valid string" })
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: "email must be in the form name@host",
  })
  email: string;

  @ApiProperty({
    description: "The password for the user account (minimum 8 characters)",
    example: "Password123!",
  })
  @Transform(({ value }) => String(value ?? "").trim())
  @IsString({message: 'Password must be a valid string'})
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;

  @IsOptional()
  @IsString({message: '2FA code must be a string'})
  code: string;
}
