import { PrismaService } from '@lib/prisma';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditLogRepository {
  private readonly logger = new Logger(AuditLogRepository.name, {
    timestamp: true,
  });
  constructor(private readonly prismaService: PrismaService) {}
}
