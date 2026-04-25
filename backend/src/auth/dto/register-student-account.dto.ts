import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class RegisterStudentAccountDto {
  @ApiProperty()
  @Transform(({ value }) =>
    value == null || value === undefined ? '' : String(value).trim(),
  )
  @IsString()
  firstName: string;

  @ApiProperty()
  @Transform(({ value }) =>
    value == null || value === undefined ? '' : String(value).trim(),
  )
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'anna.shevchenko@class.local' })
  @Transform(({ value }) =>
    value == null || value === undefined
      ? ''
      : String(value).trim().toLowerCase(),
  )
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'email must be in the form name@host (e.g. name@class.local)',
  })
  @MaxLength(320)
  email: string;

  @ApiProperty()
  @Transform(({ value }) =>
    value == null || value === undefined ? '' : String(value).trim(),
  )
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Each student password must include at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}
