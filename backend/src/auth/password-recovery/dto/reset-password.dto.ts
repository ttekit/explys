import { IsEmail, IsNotEmpty } from "class-validator";

export class ResetPasswordDto{
    @IsEmail({}, {message: ''})
    @IsNotEmpty({message: ''})
    email: string
}