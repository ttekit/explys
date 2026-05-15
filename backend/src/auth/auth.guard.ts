import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { extractAccessTokenFromRequest } from "./extract-request-access-token.util";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractAccessTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException("Token not found");
    }

    try {
      const secret = this.configService.getOrThrow<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync(token, { secret });
      request["user"] = payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    return true;
  }
}
