import { IsNotEmpty, IsString } from "class-validator";

export class ConfirmationDto{
    @IsString({message: 'Token must be a string.'})
    @IsNotEmpty({message:'Token field cannot be empty.'})
    token: string
}