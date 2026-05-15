import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { EmailConfirmationService } from "./email-confirmation.service";
import { Request, Response } from "express";
import { ConfirmationDto } from "./dto/confirmation.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "src/users/users.service";
import { ConfigService } from "@nestjs/config";
@ApiTags("email-confirmation")
@Controller("email-confirmation")
export class EmailConfirmationController {
  constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  public async newVerification(
    @Req() req: Request,
    @Query() dto: ConfirmationDto,
  ) {
    return this.emailConfirmationService.newVerification(req, dto);
  }
  @Get("confirm")
  @ApiOperation({ summary: "Confirm email via token" })
  async confirm(
    @Req() req: Request,
    @Query("token") token: string,
    @Res() res: Response,
  ) {
    await this.emailConfirmationService.newVerification(req, { token });

    const frontendUrl =
      this.configService.getOrThrow<string>("FRONTEND_URL");
    return res.redirect(`${frontendUrl}/registrationDetails`);
  }

  @Post("resend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend verification token" })
  async resend(@Body("email") email: string) {
    const user = await this.userService.FindByEmail(email);
    if (!user) throw new NotFoundException("User not found");

    return await this.emailConfirmationService.sendVerificationToken(user);
  }
}
