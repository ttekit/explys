import { ConfigService } from "@nestjs/config";
import { TypeOptions } from "src/auth/provider/provider.constants";
import { GoogleProvider } from "src/auth/provider/services/google-provider";

export const getProvidersConfig = async (
  configService: ConfigService,
): Promise<TypeOptions> => ({
  baseUrl: configService.get("APPLICATION_URL") || "http://localhost:4200", 
  services: [
    new GoogleProvider({
      client_id: configService.get("GOOGLE_CLIENT_ID") || "dummy_id",

      client_secret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
      scopes: ["email", "profile"],
    }),
  ],
});