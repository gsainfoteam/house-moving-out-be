import { Injectable } from '@nestjs/common';
import { PrismaTransaction } from 'src/common/types';
import { AuditLogRepository } from './audit-log.repository';
import { Loggable } from '@lib/logger';

@Loggable()
@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async createAuditLogInTx(
    adminUuid: string,
    action: string,
    data: string,
    tx: PrismaTransaction,
  ) {
    await this.auditLogRepository.createAuditLogInTx(
      adminUuid,
      action,
      data,
      tx,
    );
  }
}
