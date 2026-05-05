import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AlcorythmModule } from "../alcorythm/alcorythm.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { ApiTokenOrJwtAuthGuard } from "./guards/api-token-or-jwt.guard";
import { UserSelfOrApiGuard } from "./guards/user-self-or-api.guard";
import { UsersService } from "src/users/users.service";

@Module({
  imports: [
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
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    ApiTokenOrJwtAuthGuard,
    UserSelfOrApiGuard,
    UsersService,
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
