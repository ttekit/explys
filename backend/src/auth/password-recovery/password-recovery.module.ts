import { Module } from "@nestjs/common";
import { PasswordRecoveryService } from "./password-recovery.service";
import { PasswordRecoveryController } from "./password-recovery.controller";
import { UsersService } from "src/users/users.service";
import { MailService } from "src/common/mail/mail.service";
import { AlcorythmModule } from "src/alcorythm/alcorythm.module";

@Module({
  imports: [AlcorythmModule],
  controllers: [PasswordRecoveryController],
  providers: [PasswordRecoveryService, UsersService, MailService],
})
export class PasswordRecoveryModule {}
