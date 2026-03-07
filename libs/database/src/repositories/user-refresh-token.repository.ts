import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { Prisma, UserRefreshToken } from 'generated/prisma/client';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class UserRefreshTokenRepository {
  private readonly logger = new Logger(UserRefreshTokenRepository.name);
  constructor(private readonly databaseService: DatabaseService) {}

  async deleteUserRefreshToken(hashedRefreshToken: string): Promise<void> {
    await this.databaseService.userRefreshToken
      .deleteMany({
        where: {
          refreshToken: hashedRefreshToken,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteUserRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteUserRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async setUserRefreshToken(
    userUuid: string,
    hashedRefreshToken: string,
    sessionId: string,
    expiredAt: Date,
  ): Promise<void> {
    await this.databaseService.userRefreshToken
      .create({
        data: {
          userUuid,
          refreshToken: hashedRefreshToken,
          sessionId,
          expiredAt,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `setUserRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`setUserRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteAllUserRefreshTokens(userUuid: string): Promise<void> {
    await this.databaseService.userRefreshToken
      .deleteMany({
        where: {
          userUuid,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteAllUserRefreshTokens prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteAllUserRefreshTokens error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteAllUserRefreshTokensInTx(
    userUuid: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.userRefreshToken
      .deleteMany({
        where: {
          userUuid,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteAllUserRefreshTokensInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteAllUserRefreshTokensInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async setUserRefreshTokenInTx(
    userUuid: string,
    hashedRefreshToken: string,
    sessionId: string,
    expiredAt: Date,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.userRefreshToken
      .create({
        data: {
          userUuid,
          refreshToken: hashedRefreshToken,
          sessionId,
          expiredAt,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `setUserRefreshTokenInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`setUserRefreshTokenInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findUserByRefreshToken(
    hashedRefreshToken: string,
  ): Promise<Pick<UserRefreshToken, 'userUuid' | 'sessionId' | 'expiredAt'>> {
    return await this.databaseService.userRefreshToken
      .findUniqueOrThrow({
        where: {
          refreshToken: hashedRefreshToken,
          expiredAt: { gt: new Date() },
        },
        select: {
          userUuid: true,
          sessionId: true,
          expiredAt: true,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('user refresh token not found');
            throw new UnauthorizedException('User refresh token not found');
          }
          this.logger.error(
            `findUserByRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findUserByRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findUserRefreshTokenBySessionId(
    userUuid: string,
    sessionId: string,
  ): Promise<UserRefreshToken | null> {
    return await this.databaseService.userRefreshToken
      .findFirst({
        where: {
          userUuid,
          sessionId,
          expiredAt: { gt: new Date() },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findUserRefreshTokenBySessionId prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findUserRefreshTokenBySessionId error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
