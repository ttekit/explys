import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma.service";
import {
  hasPaidSubscriptionAccess,
  isSubscriptionEnforcementDisabled,
} from "../../billing/subscription-access.util";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { UserRole } from "@generated/prisma/enums";
import { extractAccessTokenFromRequest } from "../extract-request-access-token.util";

/**
 * Requires an active Stripe-backed subscription for learner JWT calls.
 * Bypass: `SKIP_SUBSCRIPTION_ENFORCEMENT`, automatic skip when `NODE_ENV=development`,
 * @Public routes, routes without Bearer token (other guards must enforce auth),
 * allowlisted paths (see ALLOWLIST), teachers, roster students (`teacherId` set).
 */
@Injectable()
export class RequireActiveSubscriptionGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  /** Exact allowlist: HTTP method + path (Express `req.path`, no query string). */
  private static readonly ALLOWLIST: ReadonlySet<string> = new Set([
    "POST /auth/register",
    "POST /auth/login",
    "GET /auth/profile",
    "POST /auth/profile/regenerate-studying-plan",
    "POST /billing/checkout",
    "GET /billing/stripe-publishable-key",
    "POST /billing/webhook",
    "GET /",
    "GET /status",
    "GET /health",
    "GET /genres",
    "GET /placement-test/status",
    "GET /placement-test/document",
    "POST /placement-test/complete",
  ]);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.method === "OPTIONS") {
      return true;
    }

    const skip = this.config.get<string>("SKIP_SUBSCRIPTION_ENFORCEMENT");
    if (isSubscriptionEnforcementDisabled(skip)) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const path = req.path || req.url?.split("?")[0] || "";
    const key = `${req.method} ${path}`;
    if (RequireActiveSubscriptionGuard.ALLOWLIST.has(key)) {
      return true;
    }

    const token = extractAccessTokenFromRequest(req);
    if (!token) {
      return true;
    }

    let sub: unknown;
    try {
      const secret = this.config.getOrThrow<string>("JWT_SECRET");
      const payload = await this.jwt.verifyAsync<{ sub: unknown }>(token, {
        secret,
      });
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const userId = Number(sub);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException("Invalid token subject");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        teacherId: true,
        subscriptionStatus: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.role === UserRole.TEACHER || user.role === UserRole.ADMIN || user.teacherId != null) {
      return true;
    }

    if (hasPaidSubscriptionAccess(user.subscriptionStatus)) {
      return true;
    }

    throw new ForbiddenException({
      message: "An active subscription is required to use this resource.",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }
}
