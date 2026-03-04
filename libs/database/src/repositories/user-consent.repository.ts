import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentType, Prisma } from 'generated/prisma/client';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class UserConsentRepository {
  private readonly logger = new Logger(UserConsentRepository.name);

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
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
