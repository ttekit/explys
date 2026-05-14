import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { Request } from "express";
import { User } from "@generated/prisma/client";


@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(private userService: UsersService) {}

  
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (typeof request.session.userId === 'undefined') {
      throw new UnauthorizedException("");
    }

    const user = await this.userService.findById(+request.session.userId);

    request.user = user;

    return true;
  }
}
