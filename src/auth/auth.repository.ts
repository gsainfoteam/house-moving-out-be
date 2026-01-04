import { PrismaService } from '@lib/prisma';
import {
  ConflictException,
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

  async setAdminRefreshToken(
    id: string,
    hashedRefreshToken: string,
    sessionId: string,
  ): Promise<void> {
    await this.prismaService.adminRefreshToken
      .create({
        data: {
          adminId: id,
          refreshToken: hashedRefreshToken,
          sessionId,
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

  async findAdminByRefreshToken(
    hashedRefreshToken: string,
  ): Promise<Pick<AdminRefreshToken, 'adminId' | 'sessionId'>> {
    return await this.prismaService.adminRefreshToken
      .findUniqueOrThrow({
        where: {
          refreshToken: hashedRefreshToken,
          expiredAt: { gt: new Date() },
        },
        select: {
          adminId: true,
          sessionId: true,
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
    adminId: string,
    sessionId: string,
  ): Promise<AdminRefreshToken | null> {
    return await this.prismaService.adminRefreshToken
      .findFirst({
        where: {
          adminId,
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

  async deleteAllAdminRefreshTokens(adminId: string): Promise<void> {
    await this.prismaService.adminRefreshToken
      .deleteMany({
        where: {
          adminId,
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
    id: string,
    name: string,
    email: string,
    phoneNumber: string,
    studentNumber: string,
    tx: PrismaTransaction,
  ): Promise<User> {
    return await tx.user
      .upsert({
        where: { id },
        create: {
          id,
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

  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prismaService.userRefreshToken
      .deleteMany({
        where: {
          userId,
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
    userId: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.userRefreshToken
      .deleteMany({
        where: {
          userId,
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
    id: string,
    hashedRefreshToken: string,
    sessionId: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.userRefreshToken
      .create({
        data: {
          userId: id,
          refreshToken: hashedRefreshToken,
          sessionId,
          expiredAt: new Date(Date.now() + this.userRefreshTokenExpire),
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
  ): Promise<Pick<UserRefreshToken, 'userId' | 'sessionId'>> {
    return await this.prismaService.userRefreshToken
      .findUniqueOrThrow({
        where: {
          refreshToken: hashedRefreshToken,
          expiredAt: { gt: new Date() },
        },
        select: {
          userId: true,
          sessionId: true,
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
    userId: string,
    sessionId: string,
  ): Promise<UserRefreshToken | null> {
    return await this.prismaService.userRefreshToken
      .findFirst({
        where: {
          userId,
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

  async findUser(id: string): Promise<User> {
    return await this.prismaService.user
      .findFirstOrThrow({
        where: {
          id,
          deletedAt: null,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`user not found: ${id}`);
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
    userId: string,
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
            userId,
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

  async getActivePolicyVersionInTx(
    type: ConsentType,
    tx: PrismaTransaction,
  ): Promise<{ version: string; createdAt: Date } | null> {
    return await tx.policyVersion
      .findFirst({
        where: {
          type,
          isActive: true,
        },
        select: {
          version: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `getActivePolicyVersionInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`getActivePolicyVersionInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async getLatestUserConsentInTx(
    userId: string,
    consentType: ConsentType,
    tx: PrismaTransaction,
  ): Promise<{ version: string; agreedAt: Date } | null> {
    return await tx.userConsent
      .findFirst({
        where: {
          userId,
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

  async createNewPolicyVersion(
    type: ConsentType,
    version: string,
  ): Promise<{
    id: string;
    type: ConsentType;
    version: string;
    isActive: boolean;
    createdAt: Date;
  }> {
    return await this.prismaService.$transaction(async (tx) => {
      await tx.policyVersion.updateMany({
        where: {
          type,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return await tx.policyVersion
        .create({
          data: {
            type,
            version,
            isActive: true,
          },
        })
        .catch((error) => {
          if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
              this.logger.debug(
                `Policy version already exists: ${type} ${version}`,
              );
              throw new ConflictException('Policy version already exists');
            }
            this.logger.error(
              `createNewPolicyVersion prisma error: ${error.message}`,
            );
            throw new InternalServerErrorException('Database Error');
          }
          this.logger.error(`createNewPolicyVersion error: ${error}`);
          throw new InternalServerErrorException('Unknown Error');
        });
    });
  }
}
