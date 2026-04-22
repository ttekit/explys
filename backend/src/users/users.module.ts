import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AlcorythmModule } from "../alcorythm/alcorythm.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AlcorythmModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
