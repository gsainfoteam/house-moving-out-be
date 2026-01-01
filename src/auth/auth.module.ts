import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@lib/prisma';
import { InfoteamIdpModule } from '@lib/infoteam-idp';
import { JwtModule } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { AdminGuard } from './guard/admin.guard';
import { AdminStrategy } from './guard/admin.strategy';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    InfoteamIdpModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AdminGuard, AdminStrategy],
})
export class AuthModule {}
