import { TokenType } from "@generated/prisma/enums";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MailService } from "src/common/mail/mail.service";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class TwoFactorAuthService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  public async validateTwoFactorToken(email: string, code: string) {
    // const existingToken = await this.prismaService.token.findFirst({
    //   where: {
    //     email,
    //     type: TokenType.TWO_FACTOR,
    //   },
    // });

    // if (!existingToken) {
    //   throw new NotFoundException(
    //     "Two-factor authentication token not found. Please ensure that you requested a token for this email address.",
    //   );
    // }

    // if (existingToken.token !== code) {
    //   throw new BadRequestException(
    //     "Invalid two-factor authentication code. Please check the code you entered and try again.",
    //   );
    // }

    // const hasExpired = new Date(existingToken.expiresIn) < new Date();

    // if (hasExpired) {
    //   throw new BadRequestException(
    //     "Two-factor authentication token has expired. Please request a new token.",
    //   );
    // }

    // await this.prismaService.token.delete({
    //   where: {
    //     id: existingToken.id,
    //     type: TokenType.TWO_FACTOR,
    //   },
    // });

    return true;
  }

  public async sendTwoFactorToken(email: string) {
    // const twoFactorToken = await this.generateTwoFactorToken(email);

    // // await this.mailService.sendTwoFactorTokenEmail(
    // //   twoFactorToken.email,
    // //   twoFactorToken.token,
    // // );

    // console.log(`==== 2FA CODE FOR ${email}: ${twoFactorToken.token} ====`);

    return true;
  }

  private async generateTwoFactorToken(email: string) {
    const token = Math.floor(
      Math.random() * (1000000 - 100000) + 100000,
    ).toString();
    const expiresIn = new Date(new Date().getTime() + 300000);

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenType.TWO_FACTOR,
      },
    });

    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
          type: TokenType.TWO_FACTOR,
        },
      });
    }
    const TwoFactorToken = await this.prismaService.token.upsert({
      where: {
        email: email.toLowerCase(),
      },
      update: {
        token,
        expiresIn,
        type: TokenType.TWO_FACTOR,
      },
      create: {
        email,
        token,
        expiresIn,
        type: TokenType.TWO_FACTOR,
      },
    });

    return TwoFactorToken;
  }
}
