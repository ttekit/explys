import { UnauthorizedException } from "@nestjs/common";

/** Reads numeric user id from Nest JWT payloads (`auth.service` signs `{ sub: number }`). */
export function jwtSubToUserId(user: unknown): number {
  if (!user || typeof user !== "object" || !("sub" in user)) {
    throw new UnauthorizedException("Invalid session");
  }
  const raw = (user as { sub: unknown }).sub;
  const n =
    typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new UnauthorizedException("Invalid session");
  }
  return Math.trunc(n);
}
