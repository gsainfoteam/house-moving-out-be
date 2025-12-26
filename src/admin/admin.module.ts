import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@lib/prisma';
import { InfoteamIdpModule } from '@lib/infoteam-idp';
import { JwtModule } from '@nestjs/jwt';
import ms, { StringValue } from 'ms';
import { AdminRepository } from './admin.repository';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    InfoteamIdpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn:
            ms(configService.getOrThrow<StringValue>('ADMIN_JWT_EXPIRE')) /
            1000,
          algorithm: 'HS256',
          audience: configService.get<string>('ADMIN_JWT_AUDIENCE'),
          issuer: configService.get<string>('ADMIN_JWT_ISSUER'),
        },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
})
export class AdminModule {}
