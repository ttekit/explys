import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

/**
 * Requires `x-api-token` matching `API_TOKEN`; ignores Bearer JWT so admin KPI routes
 * are not impersonated via a learner session header.
 *
 * Mirrors `GlobalApiTokenGuard` dev waiver: missing token requirement when NODE_ENV≠production.
 */
@Injectable()
export class ApiTokenOnlyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    const expected = this.configService.get<string>("API_TOKEN");
    const request = context.switchToHttp().getRequest<Request>();

    if (nodeEnv !== "production" && !expected) {
      return true;
    }

    if (nodeEnv === "production" && !expected) {
      throw new ServiceUnavailableException(
        "API_TOKEN is not configured for production",
      );
    }

    const received = request.header("x-api-token");
    if (!received || !expected || received !== expected) {
      throw new UnauthorizedException("Admin API token required");
    }

    return true;
  }
}
