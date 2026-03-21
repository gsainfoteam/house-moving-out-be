import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from './schedule/schedule.module';
import { ApplicationModule } from './application/application.module';
import { LoggerModule } from '@lib/logger';
import { InspectorModule } from './inspector/inspector.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';
import { ArticleModule } from './article/article.module';
import axios from 'axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      load: [
        async () => {
          const token = process.env.AWS_SESSION_TOKEN;
          if (!token) {
            console.info('AWS_SESSION_TOKEN is not set');
            return {};
          }
          const getParameter = async (name: string) => {
            return await axios
              .get<{ Parameter: { Value: string } }>(
                'http://localhost:2773/systemsmanager/parameters/get',
                {
                  params: { name, withDecryption: true },
                  headers: { 'X-Aws-Parameters-Secrets-Token': token },
                },
              )
              .then((res) => res.data.Parameter.Value);
          };
          const config = {
            DATABASE_URL: await getParameter('/moving-out/DATABASE_URL'),
            USER_JWT_SECRET: await getParameter('/moving-out/USER_JWT_SECRET'),
          };
          console.info(config);
          return config;
        },
      ],
    }),
    AuthModule,
    ScheduleModule,
    ApplicationModule,
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
