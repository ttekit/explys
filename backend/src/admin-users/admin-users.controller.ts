import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAdminGuard } from "src/auth/guards/jwt-admin.guard";
import { CreateUserDto } from "src/users/dto/create-user.dto";
import { UsersService } from "src/users/users.service";
import { AdminUsersService } from "./admin-users.service";

@ApiTags("admin-users")
@Controller("admin/users")
@UseGuards(JwtAdminGuard)
@ApiBearerAuth("JWT-auth")
export class AdminUsersController {
  constructor(
    private readonly adminUsers: AdminUsersService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List users with summary stats (admin API token)" })
  @ApiResponse({ status: 200, description: "Users with watch/test counts" })
  list() {
    return this.adminUsers.findAllSummary();
  }

  @Post()
  @ApiOperation({
    summary: "Create user (admin API token; same rules as POST /users)",
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: "User created" })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
