import { PrismaService } from '@lib/prisma';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { AdminRefreshToken } from 'generated/prisma/browser';
import { Admin } from 'generated/prisma/client';
import ms, { StringValue } from 'ms';

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);
  private readonly adminRefreshTokenExpire: number;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.adminRefreshTokenExpire = ms(
      this.configService.getOrThrow<StringValue>('ADMIN_REFRESH_TOKEN_EXPIRE'),
    );
  }

  async findAdmin(id: string): Promise<Admin> {
    return await this.prismaService.admin
      .findUniqueOrThrow({
        where: {
          id,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`admin not found: ${id}`);
            throw new UnauthorizedException();
          }
          this.logger.error(`findAdmin prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAdmin error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async setAdminRefreshToken(id: string, refreshToken: string): Promise<void> {
    await this.prismaService.adminRefreshToken
      .create({
        data: {
          adminId: id,
          refreshToken,
          expiredAt: new Date(Date.now() + this.adminRefreshTokenExpire),
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `setAdminRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`setAdminRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findAdminRefreshToken(
    refreshToken: string,
  ): Promise<Pick<AdminRefreshToken, 'adminId'>> {
    return await this.prismaService.adminRefreshToken
      .findUniqueOrThrow({
        where: {
          refreshToken,
          expiredAt: { gt: new Date() },
        },
        select: {
          adminId: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`refreshToken not found: ${refreshToken}`);
            throw new UnauthorizedException();
          }
          this.logger.error(
            `findAdminRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAdminRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteAdminRefreshToken(
    adminId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prismaService.adminRefreshToken
      .delete({
        where: {
          adminId,
          refreshToken,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('refreshToken not found');
            throw new NotFoundException();
          }
          this.logger.error(
            `deleteAdminRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteAdminRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
