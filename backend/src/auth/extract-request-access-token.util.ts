import { Request } from "express";

/**
 * JWT from `Authorization: Bearer` or `X-Access-Token` when `Authorization` is used for
 * reverse-proxy HTTP Basic Auth (browser cannot send two Authorization schemes).
 */
export function extractAccessTokenFromRequest(request: Request): string | undefined {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token || undefined;
  }
  const alt = request.headers["x-access-token"];
  if (typeof alt === "string" && alt.trim()) {
    return alt.trim();
  }
  return undefined;
}
