import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AlcorythmModule } from "./alcorythm/alcorythm.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { ContentMediaModule } from "./content/content-media/content-media.module";
import { ContentStatsModule } from "./content/content-stats/content-stats.module";
import { ContentVideoModule } from "./content/content-video/content-video.module";
import { ContentsModule } from "./contents/contents.module";
import { PrismaModule } from "./prisma.module";
import { TagsModule } from "./tags/tags.module";
import { TopicsModule } from "./topics/topics.module";
import { UsersModule } from "./users/users.module";
import { GlobalApiTokenGuard } from "./auth/global-api-token.guard";
import { PlacementTestModule } from "./placement-test/placement-test.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentsModule,
    ContentVideoModule,
    ContentStatsModule,
    ContentMediaModule,
    AlcorythmModule,
    TagsModule,
    CategoriesModule,
    TopicsModule,
    PlacementTestModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: GlobalApiTokenGuard },
  ],
})
export class AppModule { }
