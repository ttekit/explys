import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Skip `GlobalApiTokenGuard` `x-api-token` check (e.g. Stripe webhooks). Does not bypass route JWT guards. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
