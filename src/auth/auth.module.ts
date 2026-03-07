import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { InfoteamAccountModule } from '@lib/infoteam-account';
import { JwtModule } from '@nestjs/jwt';
import { AdminGuard } from './guard/admin.guard';
import { AdminStrategy } from './guard/admin.strategy';
import { UserGuard } from './guard/user.guard';
import { UserStrategy } from './guard/user.strategy';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [
    ConfigModule,
    InfoteamAccountModule,
    JwtModule.register({}),
    HttpModule,
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminGuard, AdminStrategy, UserGuard, UserStrategy],
})
export class AuthModule {}
