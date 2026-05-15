import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@generated/prisma/enums";
import { PrismaService } from "src/prisma.service";
import { Request } from "express";
import { extractAccessTokenFromRequest } from "../extract-request-access-token.util";

type JwtPayload = { sub?: unknown; email?: unknown };

type AdminRequest = Request & {
  user?: JwtPayload & { role: UserRole; sub: number };
};

/**
 * Requires a valid Bearer JWT whose subject resolves to a user with {@link UserRole.ADMIN}.
 * Used for admin SPA routes instead of {@link ApiTokenOnlyGuard} so learners cannot call
 * admin APIs even when `x-api-token` is present in the browser bundle.
 */
@Injectable()
export class JwtAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const token = extractAccessTokenFromRequest(req);
    if (!token) {
      throw new UnauthorizedException("Token not found");
    }
    try {
      const secret = this.configService.getOrThrow<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
      const userId = Number(payload.sub);
      if (!Number.isFinite(userId)) {
        throw new UnauthorizedException("Invalid token subject");
      }
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!row) {
        throw new UnauthorizedException("User not found");
      }
      if (row.role !== UserRole.ADMIN) {
        throw new ForbiddenException("Admin access required");
      }
      req.user = {
        ...payload,
        sub: userId,
        role: UserRole.ADMIN,
      };
      return true;
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
