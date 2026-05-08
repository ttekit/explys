import { PartialType } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
import { IsBoolean, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString({ message: "Name must be a string." })
  @IsNotEmpty({ message: "Name is required." })
  name: string;

  @IsString({ message: "Email must be a string." })
  @IsEmail({}, { message: "Incorrect email format." })
  @IsNotEmpty({ message: "Email is required." })
  email: string;

  @IsBoolean({ message: "isTwoFactorEnabled must be a boolean value." })
  isTwoFactorEnabled: boolean;
}
