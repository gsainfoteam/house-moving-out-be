import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class AuditLogRepository {
  private readonly logger = new Logger(AuditLogRepository.name, {
    timestamp: true,
  });
  constructor() {}

  async createAuditLogInTx(
    adminUuid: string,
    action: string,
    data: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.auditLog
      .create({
        data: {
          adminUuid,
          action,
          data,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `createAuditLogInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createAuditLogInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
