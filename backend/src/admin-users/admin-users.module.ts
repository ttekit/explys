import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { UsersModule } from "src/users/users.module";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
