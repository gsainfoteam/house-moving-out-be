import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule, DatabaseService } from '@lib/database';
import { AccountModule, accountOptions } from './account';
import { AuthService } from './auth.service';

@Module({
  imports: [ConfigModule, HttpModule, DatabaseModule],
  providers: [AuthService],
  exports: [AuthService],
})
class AuthServiceModule {}

@Module({
  imports: [
    AccountModule.forRootAsync({
      isGlobal: true,
      imports: [AuthServiceModule, DatabaseModule],
      inject: [ConfigService, AuthService, DatabaseService],
      useFactory: accountOptions,
    }),
  ],
})
export class AuthModule {}
