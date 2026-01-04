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

  async deleteExpiredAdminRefreshTokens(adminId: string): Promise<void> {
    await this.prismaService.adminRefreshToken
      .deleteMany({
        where: {
          adminId,
          expiredAt: { lt: new Date() },
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

  async deleteExpiredUserRefreshTokensInTx(
    userId: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.userRefreshToken
      .deleteMany({
        where: {
          userId,
          expiredAt: { lt: new Date() },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteExpiredUserRefreshTokensInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteExpiredUserRefreshTokensInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async setUserRefreshTokenInTx(
    id: string,
    refreshToken: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.userRefreshToken
      .create({
        data: {
          userId: id,
          refreshToken,
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

  async findUserRefreshToken(
    refreshToken: string,
  ): Promise<Pick<UserRefreshToken, 'userId'>> {
    return await this.prismaService.userRefreshToken
      .findUniqueOrThrow({
        where: {
          refreshToken,
          expiredAt: { gt: new Date() },
        },
        select: {
          userId: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`refreshToken not found: ${refreshToken}`);
            throw new UnauthorizedException();
          }
          this.logger.error(
            `findUserRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findUserRefreshToken error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findUser(id: string): Promise<User> {
    return await this.prismaService.user
      .findUniqueOrThrow({
        where: {
          id,
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

  async deleteUserRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prismaService.userRefreshToken
      .delete({
        where: {
          userId,
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
            `deleteUserRefreshToken prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteUserRefreshToken error: ${error}`);
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
      await tx.userConsent.createMany({
        data: consents.map((consent) => ({
          userId,
          consentType: consent.consentType,
          version: consent.version,
        })),
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
              throw new InternalServerErrorException(
                'Policy version already exists',
              );
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
