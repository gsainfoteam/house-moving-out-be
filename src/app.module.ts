import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MoveOutModule } from './move-out/move-out.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    AuthModule,
    MoveOutModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
