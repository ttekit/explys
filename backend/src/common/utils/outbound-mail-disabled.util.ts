import { ConfigService } from "@nestjs/config";

/** True when `DISABLE_EMAIL` is `true`, `1`, or `yes` (case-insensitive). */
export function isOutboundMailDisabled(configService: ConfigService): boolean {
  const raw = configService.get<string>("DISABLE_EMAIL");
  if (typeof raw !== "string") {
    return false;
  }
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
