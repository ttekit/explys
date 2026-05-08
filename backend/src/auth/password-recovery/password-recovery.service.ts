import { TokenType } from "@generated/prisma/enums";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MailService } from "src/common/mail/mail.service";
import { PrismaService } from "src/prisma.service";
import { UsersService } from "src/users/users.service";
import { v4 as uuidv4 } from "uuid";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { NewPasswordDto } from "./dto/new-password.dto";
import { hash } from "argon2";

@Injectable()
export class PasswordRecoveryService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UsersService,
    private readonly mailService: MailService,
  ) {}

  public async resetPassword(dto: ResetPasswordDto) {
    const existingUser = await this.userService.FindByEmail(dto.email);

    if (!existingUser) {
      throw new NotFoundException(
        "User not found. Please check the email address you entered and try again.",
      );
    }

    const passwordResetToken = await this.generatePasswordResetToken(
      existingUser.email,
    );

    await this.mailService.sendPasswordResetEmail(
      passwordResetToken.email,
      passwordResetToken.token,
    );

    return true;
  }

  public async newPassword(dto: NewPasswordDto, token: string) {
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        token,
        type: TokenType.PASSWORD_RESET,
      },
    });

    if (!existingToken) {
      throw new NotFoundException(
        "Token not found. Please check if the token is correct or request a new one.",
      );
    }

    const hasExpired = new Date(existingToken.expiresIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException(
        "Token has expired. Please request a new token to confirm your password reset.",
      );
    }

    const existingUser = await this.userService.FindByEmail(
      existingToken.email,
    );

    if (!existingUser) {
      throw new NotFoundException(
        "User not found. Please check the email address you entered and try again.",
      );
    }

    await this.prismaService.user.update({
        where: {
            id: existingUser.id
        },
        data: {
            password: await hash(dto.password)
        }
    })

    await this.prismaService.token.delete({
        where: {
            id: existingUser.id,
            type: TokenType.PASSWORD_RESET
        }
    })

    return true
  }

  private async generatePasswordResetToken(email: string) {
    const token = uuidv4();
    const expiresIn = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenType.PASSWORD_RESET,
      },
    });

    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
          type: TokenType.PASSWORD_RESET,
        },
      });
    }
    const passwordResetToken = await this.prismaService.token.create({
      data: {
        email,
        token,
        expiresIn,
        type: TokenType.PASSWORD_RESET,
      },
    });

    return passwordResetToken;
  }
}
