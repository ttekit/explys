import { IsNotEmpty, IsString, MinLength, Validate } from "class-validator";
import { IsPasswordsMatchingConstraint } from "src/common/decorators/is-password-matching-constraint.decorator";

export class NewPasswordDto {
  @IsString({ message: "Password must be a string." })
  @MinLength(6, { message: "Password must be at least 6 characters long." })
  @IsNotEmpty({ message: "New password field cannot be empty." })
  password: string;

  @Validate(IsPasswordsMatchingConstraint, { message: "Passwords don't match" })
  passwordRepeat: string;
}
