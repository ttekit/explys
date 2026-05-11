import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/components";
import { ConfirmationTemplate } from "./templates/confirmation.template";
import { ResetPasswordTemplate } from "./templates/reset-password.template";
import { TwoFactorAuthTemplate } from "./templates/two-factor-auth.template";

@Injectable()
export class MailService {
  public constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  public async sendConfirmationEmail(email: string, token: string) {
    const domain = this.configService.getOrThrow<string>("APPLICATION_URL");
    const html = await render(ConfirmationTemplate({ domain, token }));

    return this.sendMail(email, "Email confirmation", html);
  }

  public async sendPasswordResetEmail(email: string, token: string) {
    const domain = this.configService.getOrThrow<string>("APPLICATION_URL");
    const html = await render(ResetPasswordTemplate({ domain, token }));

    return this.sendMail(email, "Reset password", html);
  }

  public async sendTwoFactorTokenEmail(email: string, token: string) {
    const html = await render(TwoFactorAuthTemplate({ token }));

    return this.sendMail(email, "Verify your identity", html);
  }

  private async sendMail(email: string, subject: string, html: string) {
    try {
      const result = await this.mailerService.sendMail({
        from: '"Explys Support" <no-reply@explys.com>',
        to: email,
        subject,
        html,
      });
      console.log("✅ ПИСЬМО УСПЕШНО ОТПРАВЛЕНО В MAILTRAP");
      return result;
    } catch (error) {
      console.error("❌ ОШИБКА ПРИ ОТПРАВКЕ ПИСЬМА:", error);
      throw error;
    }
  }
}
