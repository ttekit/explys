import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { extractAccessTokenFromRequest } from "../auth/extract-request-access-token.util";

type Authed = Request & { user?: { sub: number; email: string } };

/**
 * User JWT from `Authorization: Bearer`, header `X-Access-Token` (when Basic Auth uses `Authorization`),
 * or `?access_token=` / body `access_token` (iframe-friendly).
 * Rejects x-api-token-only access so placement is always per-user.
 */
@Injectable()
export class PlacementJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Authed>();
    const query = request.query as Record<string, string | undefined>;
    const body = request.body as { access_token?: string } | undefined;
    const fromBody =
      typeof body?.access_token === "string" ? body.access_token : undefined;
    const fromQuery =
      typeof query?.access_token === "string" ? query.access_token : undefined;
    const fromHeader = extractAccessTokenFromRequest(request);
    const token = fromHeader || fromQuery || fromBody;
    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }
    try {
      const secret = this.configService.getOrThrow<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
      }>(token, { secret });
      request.user = { sub: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
