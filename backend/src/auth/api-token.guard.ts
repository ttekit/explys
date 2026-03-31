import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken = process.env.API_TOKEN;

    // Bootstrap already enforces this, but keep runtime safety as well.
    if (!expectedToken) {
      throw new UnauthorizedException('API token is not configured');
    }

    const receivedToken = request.header('x-api-token');
    if (!receivedToken || receivedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid API token');
    }

    return true;
  }
}
