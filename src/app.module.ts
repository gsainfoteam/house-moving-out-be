import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MoveOutModule } from './move-out/move-out.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ApplicationModule } from './application/application.module';
import { LoggerModule } from '@lib/logger';
import { InspectorModule } from './inspector/inspector.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    AuthModule,
    MoveOutModule,
    ScheduleModule,
    ApplicationModule,
    LoggerModule,
    InspectorModule,
    HealthModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
