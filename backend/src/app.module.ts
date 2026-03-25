import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from "./users/users.module";
import { TagsModule } from './tags/tags.module';
import { CategoriesModule } from './categories/categories.module';
import { TopicsModule } from './topics/topics.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        AuthModule,
        UsersModule,
        TagsModule,
        CategoriesModule,
        TopicsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
