import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { TagsModule } from "./tags/tags.module";
import { CategoriesModule } from "./categories/categories.module";
import { TopicsModule } from "./topics/topics.module";
import { ContentsModule } from "./contents/contents.module";
import { ContentVideoModule } from "./content/content-video/content-video.module";
import { ContentStatsModule } from "./content/content-stats/content-stats.module";
import { ContentMediaModule } from "./content/content-media/content-media.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    ContentsModule,
    ContentVideoModule,
    ContentStatsModule,
    ContentMediaModule,
    TagsModule,
    CategoriesModule,
    TopicsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
