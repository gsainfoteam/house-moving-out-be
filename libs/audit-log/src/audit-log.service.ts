import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name, {
    timestamp: true,
  });
  constructor() {}
}
