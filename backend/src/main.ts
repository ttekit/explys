import { config } from "dotenv";
import cookieParser from "cookie-parser";

config();

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { join } from "path";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import IORedis from "ioredis";
import { RedisStore } from "connect-redis";
import session from "express-session";
import { ms, StringValue } from "./common/utils/ms.util";
import { parseBoolean } from "./common/utils/parse-boolean.util";

function resolveCorsOrigin():
  | boolean
  | string
  | string[]
  | RegExp
  | ((
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void) {
  const isProd = process.env.NODE_ENV === "production";
  const raw = process.env.CORS_ORIGINS;

  if (isProd) {
    if (!raw?.trim()) {
      throw new Error("CORS_ORIGINS must be set when NODE_ENV=production");
    }
    return raw.split(",").map((s) => s.trim());
  }

  if (!raw?.trim()) {
    return true;
  }

  return raw.split(",").map((s) => s.trim());
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);
  const redis = new IORedis("redis://localhost:6379");
  //const redis = new IORedis(config.getOrThrow('REDIS_URL'))

  app.use(cookieParser(config.getOrThrow<string>("COOKIES_SECRET")));

  // Dev helper: same-origin test UI for the placement/entrance test (e.g. /dev/entrance-test.html)
  app.useStaticAssets(join(process.cwd(), "public"), { prefix: "/dev/" });

  app.enableCors({
    origin: (/*resolveCorsOrigin(),*/ config.getOrThrow<string>("ALLOWED_ORIGIN")),
    exposedHeaders: ["set-cookie"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.use(
    session({
      secret: config.getOrThrow<string>("SESSION_SECRET"),
      name: config.getOrThrow<string>("SESSION_NAME"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        domain: config.getOrThrow<string>("SESSION_DOMAIN") || undefined,
        maxAge: ms(config.getOrThrow<StringValue>("SESSION_MAX_AGE")),
        httpOnly: parseBoolean(config.getOrThrow<string>("SESSION_HTTP_ONLY")),
        secure: parseBoolean(config.getOrThrow<string>("SESSION_SECURE")),
        sameSite: "lax",
      },
      store: new RedisStore({
        client: redis,
        prefix: config.getOrThrow<string>('SESSION_FOLDER')
      })
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Eng Curses API")
    .setDescription(
      [
        "Complete English Learning Platform API - Tags, Categories, Topics, Users, and Authentication Management.",
        "",
        "**Production:** Every endpoint requires the `x-api-token` header matching `API_TOKEN` (in addition to JWT where documented).",
        "**Development:** When `NODE_ENV` is not `production`, the global API token check is disabled so you can call the API without `x-api-token`.",
      ].join("\n"),
    )
    .setVersion("1.0.0")
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management endpoints")
    .addTag("tags", "Tag management endpoints")
    .addTag("categories", "Category management endpoints")
    .addTag("topics", "Topic management endpoints")
    .addTag(
      "placement-test",
      "Entry placement test (post-registration, one time)",
    )
    .addTag("content-video", "Content Video management endpoints")
    .addTag("content-stats", "Content Statistics management endpoints")
    .addTag("content-media", "Content Media management endpoints")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT authentication token",
      },
      "JWT-auth",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "x-api-token",
        in: "header",
        description:
          "Global API key (`API_TOKEN`). Required on all requests when NODE_ENV=production.",
      },
      "api-token",
    )
    .setContact("Support", "https://example.com", "support@example.com")
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, document);

  const port = Number(process.env.PORT) || 4200;
  await app.listen(port);
}

bootstrap();
