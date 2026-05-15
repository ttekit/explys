import { ConfigService } from "@nestjs/config";
import { TypeOptions } from "src/auth/provider/provider.constants";
import { GoogleProvider } from "src/auth/provider/services/google-provider";

function resolvePublicApiBaseUrl(configService: ConfigService): string {
  const explicit = configService.get<string>("PUBLIC_API_URL")?.trim();
  if (explicit) {
    return explicit;
  }
  const port = configService.get<string>("PORT")?.trim() || "4200";
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PUBLIC_API_URL must be set when NODE_ENV=production (OAuth redirect URIs).",
    );
  }
  return `http://localhost:${port}`;
}

export const getProvidersConfig = async (
  configService: ConfigService,
): Promise<TypeOptions> => ({
  baseUrl: resolvePublicApiBaseUrl(configService), 
  services: [
    new GoogleProvider({
      client_id: configService.get("GOOGLE_CLIENT_ID") || "dummy_id",

      client_secret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
      scopes: ["email", "profile"],
    }),
  ],
});