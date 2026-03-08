import { Injectable } from '@nestjs/common';
import { PrismaTransaction, AuditLogRepository } from '@lib/database';
import { Loggable } from '@lib/logger';

@Loggable()
@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async createAuditLogInTx(
    userUuid: string,
    action: string,
    data: string,
    tx: PrismaTransaction,
  ) {
    await this.auditLogRepository.createAuditLogInTx(
      userUuid,
      action,
      data,
      tx,
    );
  }
}
