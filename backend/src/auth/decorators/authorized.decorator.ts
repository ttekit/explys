import { User } from "@generated/prisma/client";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const Authorized = createParamDecorator(
    (data: keyof User, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        const user = request.user

        return data ? user[data] : user
    }
)

