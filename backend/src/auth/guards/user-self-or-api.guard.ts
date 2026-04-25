import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";

type RequestWithAuth = Request & {
  authViaApiToken?: boolean;
  user?: { sub?: number | string };
};

@Injectable()
export class UserSelfOrApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    if (request.authViaApiToken) {
      return true;
    }

    const rawId = request.params["id"];
    const id = Number.parseInt(String(rawId), 10);
    if (Number.isNaN(id)) {
      throw new ForbiddenException();
    }

    const sub = request.user?.sub;
    if (sub == null || Number(sub) !== id) {
      throw new ForbiddenException();
    }

    return true;
  }
}
