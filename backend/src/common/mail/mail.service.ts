import { MailerService } from "@nestjs-modules/mailer";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isOutboundMailDisabled } from "src/common/utils/outbound-mail-disabled.util";
import { render } from "@react-email/components";
import { ConfirmationTemplate } from "./templates/confirmation.template";
import { ResetPasswordTemplate } from "./templates/reset-password.template";
import { TwoFactorAuthTemplate } from "./templates/two-factor-auth.template";
import { PasswordChangedTemplate } from "./templates/password-change-notification.template";
import * as React from "react";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  public constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  public async sendConfirmationEmail(email: string, token: string) {
    if (isOutboundMailDisabled(this.configService)) {
      this.logger.warn(`Outbound mail disabled (DISABLE_EMAIL); skipping confirmation to ${email}`);
      return;
    }
    const domain = this.configService.getOrThrow<string>("FRONTEND_URL");
    const html = await render(ConfirmationTemplate({ domain, token }));

    return this.sendMail(email, "Email confirmation", html);
  }

  public async sendPasswordResetEmail(email: string, token: string) {
    if (isOutboundMailDisabled(this.configService)) {
      this.logger.warn(`Outbound mail disabled (DISABLE_EMAIL); skipping password reset to ${email}`);
      return;
    }
    const domain = this.configService.getOrThrow<string>("FRONTEND_URL");
    const html = await render(ResetPasswordTemplate({ domain, token }));

    return this.sendMail(email, "Reset password", html);
  }

  public async sendTwoFactorTokenEmail(email: string, token: string) {
    if (isOutboundMailDisabled(this.configService)) {
      this.logger.warn(`Outbound mail disabled (DISABLE_EMAIL); skipping 2FA mail to ${email}`);
      return;
    }
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
      this.logger.debug(`Mail sent to ${email}: ${subject}`);
      return result;
    } catch (error) {
      this.logger.error(`Mail send failed for ${email}`, error as Error);
      throw error;
    }
  }

  async sendPasswordChangedNotification(email: string) {
    if (isOutboundMailDisabled(this.configService)) {
      this.logger.warn(`Outbound mail disabled (DISABLE_EMAIL); skipping password-changed notice to ${email}`);
      return;
    }
    try {
      const emailHtml = await render(
        React.createElement(PasswordChangedTemplate, { email }),
      );
      await this.mailerService.sendMail({
        to: email,
        subject: "Security Alert: Password Changed 🦎",
        html: emailHtml,
      });
    } catch (error) {
      this.logger.error(`Password-changed mail failed for ${email}`, error as Error);
      throw error;
    }
  }
}
