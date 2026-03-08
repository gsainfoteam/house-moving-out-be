import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [DatabaseModule],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
