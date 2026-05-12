import { TokenType } from "@generated/prisma/enums";
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "src/prisma.service";
import { v4 as uuidv4 } from "uuid";
import { ConfirmationDto } from "./dto/confirmation.dto";
import { MailService } from "src/common/mail/mail.service";
import { UsersService } from "src/users/users.service";
import { AuthService } from "../auth.service";
import { User } from "@generated/prisma/client";

@Injectable()
export class EmailConfirmationService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly userService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  public async newVerification(req: Request, dto: ConfirmationDto) {
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        token: dto.token,
        type: TokenType.VERIFICATION,
      },
    });

    if (!existingToken) {
      throw new NotFoundException(
        "Confirmation token not found. Please make sure you have the correct token.",
      );
    }

    const hasExpired = new Date(existingToken.expiresIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException(
        "Confirmation token has expired. Pleas  e request a new confirmation token.",
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
        id: existingUser.id,
      },
      data: {
        isVerified: true,
      },
    });

    await this.prismaService.token.delete({
      where: {
        id: existingToken.id,
        type: TokenType.VERIFICATION,
      },
    });

    return this.authService.saveSession(req, existingUser);
  }

  public async sendVerificationToken(user: User) {
    const verificationToken = await this.generateVerificationToken(user.email);

    await this.mailService.sendConfirmationEmail(
      verificationToken.email,
      verificationToken.token,
    );

    return true;
  }

  private async generateVerificationToken(email: string) {
    const token = uuidv4();
    const expiresIn = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email: email,
        type: TokenType.VERIFICATION,
      },
    });

    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
        },
      });
    }
    // const verificationToken = await this.prismaService.token.upsert({
    //   where: {
    //     email: email,
    //   },
    //   update: {
    //     token: token,
    //     expiresIn: expiresIn,
    //     type: TokenType.VERIFICATION,
    //   },
    //   create: {
    //     email: email,
    //     token: token,
    //     expiresIn: expiresIn,
    //     type: TokenType.VERIFICATION,
    //   },
    // });
    const verificationToken = await this.prismaService.token.create({
      data: {
        email,
        token,
        expiresIn,
        type: TokenType.VERIFICATION,
      },
    });
    console.log(`Згенеровано новий токен для ${email}: ${token}`);

    return verificationToken;
  }
}
