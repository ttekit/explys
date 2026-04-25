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
 * In production, every HTTP request must include a valid `x-api-token` header
 * matching `API_TOKEN`. In non-production (e.g. NODE_ENV=development), this
 * check is skipped so local tests do not need the header.
 */
@Injectable()
export class GlobalApiTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    if (nodeEnv !== "production") {
      return true;
    }

    const expected = this.configService.get<string>("API_TOKEN");
    if (!expected) {
      throw new ServiceUnavailableException(
        "API_TOKEN is not configured for production",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const received = request.header("x-api-token");
    if (!received || received !== expected) {
      throw new UnauthorizedException("Invalid or missing API token");
    }

    return true;
  }
}
