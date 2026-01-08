import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { PrismaModule } from '@lib/prisma';

@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, AuditLogRepository],
  exports: [AuditLogService],
})
export class AuditLogModule {}
