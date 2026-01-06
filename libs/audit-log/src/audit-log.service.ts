import { Injectable, Logger } from '@nestjs/common';
import { PrismaTransaction } from 'src/common/types';
import { AuditLogRepository } from './audit-log.repository';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name, {
    timestamp: true,
  });
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async createAuditLogInTx(
    adminId: string,
    action: string,
    data: string,
    tx: PrismaTransaction,
  ) {
    await this.auditLogRepository.createAuditLogInTx(adminId, action, data, tx);
  }
}
