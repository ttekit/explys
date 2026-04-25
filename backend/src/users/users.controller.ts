import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { ApiTokenOrJwtAuthGuard } from "../auth/guards/api-token-or-jwt.guard";
import { UserSelfOrApiGuard } from "../auth/guards/user-self-or-api.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new user",
    description:
      "In production, requires `x-api-token` (enforced globally) matching API_TOKEN.",
  })
  @ApiResponse({ status: 201, description: "User successfully created." })
  @ApiResponse({
    status: 400,
    description: "Unable to create user with the provided information.",
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all users",
    description:
      "In production, requires `x-api-token` (enforced globally) matching API_TOKEN.",
  })
  @ApiResponse({ status: 200, description: "Return all users." })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  @UseGuards(ApiTokenOrJwtAuthGuard, UserSelfOrApiGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiSecurity("api-token")
  @ApiOperation({ summary: "Get user by ID (self or API token)" })
  @ApiResponse({ status: 200, description: "Return a single user." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "User not found." })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(ApiTokenOrJwtAuthGuard, UserSelfOrApiGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiSecurity("api-token")
  @ApiOperation({ summary: "Update user (self or API token)" })
  @ApiResponse({ status: 200, description: "User successfully updated." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "User not found." })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @UseGuards(ApiTokenOrJwtAuthGuard, UserSelfOrApiGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiSecurity("api-token")
  @ApiOperation({ summary: "Delete user (self or API token)" })
  @ApiResponse({ status: 200, description: "User successfully deleted." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "User not found." })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
