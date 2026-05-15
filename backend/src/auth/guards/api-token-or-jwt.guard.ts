import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { extractAccessTokenFromRequest } from "../extract-request-access-token.util";

type AuthedRequest = Request & {
  user?: unknown;
  authViaApiToken?: boolean;
};

/**
 * Prefer JWT when `Authorization: Bearer` is sent (so a valid user session cannot
 * be escalated via a shared `x-api-token`). If there is no Bearer token, allow
 * access when `x-api-token` matches `API_TOKEN` (admin-style tooling).
 * Invalid Bearer tokens are rejected (no fallback to API token).
 */
@Injectable()
export class ApiTokenOrJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const expectedApiToken = this.configService.get<string>("API_TOKEN");
    const receivedApi = request.header("x-api-token");
 
    const jwtToken = extractAccessTokenFromRequest(request);
    if (jwtToken) {
      try {
        const secret = this.configService.getOrThrow<string>("JWT_SECRET");
        const payload = await this.jwtService.verifyAsync(jwtToken, { secret });
        request.user = payload;
        request.authViaApiToken = false;
        return true;
      } catch {
        throw new UnauthorizedException("Invalid or expired token");
      }
    }

    if (expectedApiToken && receivedApi === expectedApiToken) {
      request.authViaApiToken = true;
      return true;
    }

    throw new UnauthorizedException("Authentication required");
  }
}
