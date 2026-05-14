import { forwardRef, Module } from "@nestjs/common";
import { EmailConfirmationService } from "./email-confirmation.service";
import { EmailConfirmationController } from "./email-confirmation.controller";
import { MailModule } from "src/common/mail/mail.module";
import { AuthModule } from "../auth.module";
import { UsersService } from "src/users/users.service";
import { MailService } from "src/common/mail/mail.service";
import { AlcorythmModule } from "src/alcorythm/alcorythm.module";

@Module({
  imports: [MailModule, forwardRef(() => AuthModule), AlcorythmModule],
  controllers: [EmailConfirmationController],
  providers: [EmailConfirmationService, UsersService, MailService],
  exports: [EmailConfirmationService],
})
export class EmailConfirmationModule {}
