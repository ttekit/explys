import { IsEmail, IsString } from 'class-validator';

export class UpdateEmailDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsString()
  newEmail: string;
}