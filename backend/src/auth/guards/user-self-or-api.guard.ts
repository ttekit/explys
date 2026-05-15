import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { UserRole } from "@generated/prisma/enums";
import { PrismaService } from "src/prisma.service";

type RequestWithAuth = Request & {
  authViaApiToken?: boolean;
  user?: { sub?: number | string };
};

/**
 * Allows the route when the caller used `x-api-token`, when the JWT subject matches `:id`,
 * or when the authenticated user is an {@link UserRole.ADMIN}.
 */
@Injectable()
export class UserSelfOrApiGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    if (request.authViaApiToken) {
      return true;
    }
    const rawId = request.params["id"];
    const id = Number.parseInt(String(rawId), 10);
    if (Number.isNaN(id)) {
      throw new ForbiddenException();
    }
    const subRaw = request.user?.sub;
    if (subRaw == null) {
      throw new UnauthorizedException();
    }
    const sub = Number(subRaw);
    if (!Number.isFinite(sub)) {
      throw new UnauthorizedException();
    }
    if (sub === id) {
      return true;
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { role: true },
    });
    if (actor?.role === UserRole.ADMIN) {
      return true;
    }
    throw new ForbiddenException();
  }
}
