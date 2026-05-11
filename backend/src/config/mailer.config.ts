import { MailerOptions } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { isDev } from "src/common/utils/is-dev.utils";

export const getMailerConfig = async (
  configService: ConfigService,
): Promise<MailerOptions> => ({
  transport: {
    host: configService.getOrThrow<string>("MAIL_HOST"),
    port: configService.getOrThrow<number>("MAIL_PORT"),
    secure: false, //!isDev(configService),
    //pool: true,
    auth: {
      user: configService.getOrThrow<string>("MAIL_LOGIN"),
      pass: configService.getOrThrow<string>("MAIL_PASSWORD"),
    },
    debug: true, // Включи это! Ты увидишь в консоли, на чем именно стопор
    logger: true,
    tls: {
      rejectUnauthorized: false,
    },
  },
  defaults: {
    from: `"Explys Team " ${configService.getOrThrow<string>("MAIL_LOGIN")}`,
  },
});
