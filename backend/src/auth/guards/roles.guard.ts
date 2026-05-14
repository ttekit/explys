import { UserRole } from "@generated/prisma/enums";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(private reflector: Reflector) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass()
    ])
    const request = context.switchToHttp().getRequest();

    if(!roles) return true

    if(!roles.includes(request.user.role)) {
        throw new ForbiddenException('')
    }

    return true;
  }
}
