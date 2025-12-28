import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@lib/prisma';
import { InfoteamIdpModule } from '@lib/infoteam-idp';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { AuthRepository } from './auth.repository';
import { AdminGuard } from './guard/admin.guard';
import { AdminStrategy } from './guard/admin.strategy';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    InfoteamIdpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>('ADMIN_JWT_EXPIRE'),
          algorithm: 'HS256',
          audience: configService.getOrThrow<string>('ADMIN_JWT_AUDIENCE'),
          issuer: configService.getOrThrow<string>('ADMIN_JWT_ISSUER'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AdminGuard, AdminStrategy],
})
export class AuthModule {}
