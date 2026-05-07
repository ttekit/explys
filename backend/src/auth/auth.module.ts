import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AlcorythmModule } from "../alcorythm/alcorythm.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { ApiTokenOrJwtAuthGuard } from "./guards/api-token-or-jwt.guard";
import { UserSelfOrApiGuard } from "./guards/user-self-or-api.guard";
import { UsersService } from "src/users/users.service";
import { ProviderModule } from "./provider/provider.module";
import { getProvidersConfig } from "src/config/providers.config";
import { EmailConfirmationModule } from "./email-confirmation/email-confirmation.module";
import { MailService } from "src/common/mail/mail.service";

@Module({
  imports: [
    ProviderModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getProvidersConfig,
      inject: [ConfigService],
    }),
    AlcorythmModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => EmailConfirmationModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    ApiTokenOrJwtAuthGuard,
    UserSelfOrApiGuard,
    UsersService,
    MailService,
  ],
  exports: [
    JwtModule,
    AuthService,
    AuthGuard,
    ApiTokenOrJwtAuthGuard,
    UserSelfOrApiGuard,
  ],
})
export class AuthModule {}
