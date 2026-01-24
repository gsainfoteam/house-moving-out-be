import { PrismaService } from '@lib/prisma';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { AdminRefreshToken, UserRefreshToken } from 'generated/prisma/browser';
import { Admin, ConsentType, User } from 'generated/prisma/client';
import ms, { StringValue } from 'ms';
import { PrismaTransaction } from '../common/types';
import { UserInfo } from '@lib/infoteam-idp/types/userInfo.type';
import { Loggable } from '@lib/logger';

@Loggable()
@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);
  private readonly adminRefreshTokenExpire: number;
  private readonly userRefreshTokenExpire: number;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.adminRefreshTokenExpire = ms(
      this.configService.getOrThrow<StringValue>('ADMIN_REFRESH_TOKEN_EXPIRE'),
    );
    this.userRefreshTokenExpire = ms(
      this.configService.getOrThrow<StringValue>('USER_REFRESH_TOKEN_EXPIRE'),
    );
  }

  async findAdmin(uuid: string): Promise<Admin> {
    return await this.prismaService.admin
      .findUniqueOrThrow({
        where: {
          uuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`admin not found: ${uuid}`);
            throw new UnauthorizedException();
          }
          this.logger.error(`findAdmin prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAdmin error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async setAdminRefreshToken(
    uuid: string,
    hashedRefreshToken: string,
    sessionId: string,
    expiredAt: Date,
  ): Promise<void> {
    await this.prismaService.adminRefreshToken
      .create({
        data: {
          adminUuid: uuid,
          refreshToken: hashedRefreshToken,
          sessionId,
          expiredAt,
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

  async findAdminByRefreshToken(
    hashedRefreshToken: string,
  ): Promise<Pick<AdminRefreshToken, 'adminUuid' | 'sessionId' | 'expiredAt'>> {
    return await this.prismaService.adminRefreshToken
      .findUniqueOrThrow({
        where: {
          refreshToken: hashedRefreshToken,
          expiredAt: { gt: new Date() },
        },
        select: {
          adminUuid: true,
          sessionId: true,
          expiredAt: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('admin refresh token not found');
            throw new UnauthorizedException();
          }
          this.logger.error(
            `findAdminByRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAdminByRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findAdminRefreshTokenBySessionId(
    adminUuid: string,
    sessionId: string,
  ): Promise<AdminRefreshToken | null> {
    return await this.prismaService.adminRefreshToken
      .findFirst({
        where: {
          adminUuid,
          sessionId,
          expiredAt: { gt: new Date() },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findAdminRefreshTokenBySessionId prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAdminRefreshTokenBySessionId error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteAdminRefreshToken(hashedRefreshToken: string): Promise<void> {
    await this.prismaService.adminRefreshToken
      .deleteMany({
        where: {
          refreshToken: hashedRefreshToken,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteAdminRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteAdminRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteAllAdminRefreshTokens(adminUuid: string): Promise<void> {
    await this.prismaService.adminRefreshToken
      .deleteMany({
        where: {
          adminUuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteAllAdminRefreshTokens prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteAllAdminRefreshTokens error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async upsertUserInTx(
    { uuid, name, email, phoneNumber, studentNumber }: UserInfo,
    tx: PrismaTransaction,
  ): Promise<User> {
    return await tx.user
      .upsert({
        where: { uuid },
        create: {
          uuid,
          name,
          email,
          phoneNumber,
          studentNumber,
        },
        update: {
          name,
          email,
          phoneNumber,
          studentNumber,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(`upsertUserInTx prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`upsertUserInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteUserRefreshToken(hashedRefreshToken: string): Promise<void> {
    await this.prismaService.userRefreshToken
      .deleteMany({
        where: {
          refreshToken: hashedRefreshToken,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
    uuid: string,
    hashedRefreshToken: string,
    sessionId: string,
    expiredAt: Date,
  ): Promise<void> {
    await this.prismaService.userRefreshToken
      .create({
        data: {
          userUuid: uuid,
          refreshToken: hashedRefreshToken,
          sessionId,
          expiredAt,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
    await this.prismaService.userRefreshToken
      .deleteMany({
        where: {
          userUuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
    uuid: string,
    hashedRefreshToken: string,
    sessionId: string,
    expiredAt: Date,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.userRefreshToken
      .create({
        data: {
          userUuid: uuid,
          refreshToken: hashedRefreshToken,
          sessionId,
          expiredAt,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
    return await this.prismaService.userRefreshToken
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
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('user refresh token not found');
            throw new UnauthorizedException();
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
    return await this.prismaService.userRefreshToken
      .findFirst({
        where: {
          userUuid,
          sessionId,
          expiredAt: { gt: new Date() },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findUserRefreshTokenBySessionId prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findUserRefreshTokenBySessionId error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findUser(uuid: string): Promise<User> {
    return await this.prismaService.user
      .findFirstOrThrow({
        where: {
          uuid,
          deletedAt: null,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`user not found: ${uuid}`);
            throw new UnauthorizedException();
          }
          this.logger.error(`findUser prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findUser error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createUserConsentsInTx(
    userUuid: string,
    consents: Array<{
      consentType: ConsentType;
      version: string;
    }>,
    tx: PrismaTransaction,
  ): Promise<void> {
    if (consents.length > 0) {
      await tx.userConsent
        .createMany({
          data: consents.map((consent) => ({
            userUuid,
            consentType: consent.consentType,
            version: consent.version,
          })),
        })
        .catch((error) => {
          if (error instanceof PrismaClientKnownRequestError) {
            this.logger.error(
              `createUserConsentsInTx prisma error: ${error.message}`,
            );
            throw new InternalServerErrorException('Database Error');
          }
          this.logger.error(`createUserConsentsInTx error: ${error}`);
          throw new InternalServerErrorException('Unknown Error');
        });
    }
  }

  async getLatestUserConsentInTx(
    userUuid: string,
    consentType: ConsentType,
    tx: PrismaTransaction,
  ): Promise<{ version: string; agreedAt: Date } | null> {
    return await tx.userConsent
      .findFirst({
        where: {
          userUuid,
          consentType,
        },
        select: {
          version: true,
          agreedAt: true,
        },
        orderBy: {
          agreedAt: 'desc',
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `getLatestUserConsentInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`getLatestUserConsentInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
