import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "node_modules/@react-email/components/dist/index.cjs";
import { ConfirmationTemplate } from "./templates/confirmation.template";

@Injectable()
export class MailService {
  public constructor(private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {}


  public async sendConfirmationEmail(email:string, token: string){
    const domain = this.configService.getOrThrow<string>('ALLOWED_ORIGIN')
    const html = await render(ConfirmationTemplate({domain, token}))

    return this.sendMail(email, 'Email confirmation', html)
  }

  private sendMail(email: string, subject: string, html: string) {
    return this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }
}
