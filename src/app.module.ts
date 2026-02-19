import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MoveOutModule } from './move-out/move-out.module';
import { LoggerModule } from '@lib/logger';
import { InspectorModule } from './inspector/inspector.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';
import { ArticleModule } from './article/article.module';
import { ArticleModule } from './article/article.module';
import { ArticleModule } from './article/article.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    AuthModule,
    MoveOutModule,
    LoggerModule,
    InspectorModule,
    HealthModule,
    UserModule,
    ArticleModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
