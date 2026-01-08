import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MoveOutModule } from './move-out/move-out.module';
import { LoggerModule } from '@lib/logger';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
