import { config } from "dotenv";

config();

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";

console.log("NEST TYPE:", typeof process.env.DATABASE_URL);
console.log("NEST VALUE:", process.env.DATABASE_URL);

async function bootstrap() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Eng Curses API")
    .setDescription(
      "Complete English Learning Platform API - Tags, Categories, Topics, Users, and Authentication Management",
    )
    .setVersion("1.0.0")
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management endpoints")
    .addTag("tags", "Tag management endpoints")
    .addTag("categories", "Category management endpoints")
    .addTag("topics", "Topic management endpoints")
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
    .setContact("Support", "https://example.com", "support@example.com")
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(4200);
}
bootstrap();
