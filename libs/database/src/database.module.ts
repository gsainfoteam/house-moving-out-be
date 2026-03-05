import { Module } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { InspectionApplicationRepository } from './repositories/inspection-application.repository';
import { InspectionSlotRepository } from './repositories/inspection-slot.repository';
import { InspectionTargetInfoRepository } from './repositories/inspection-target-info.repository';
import { InspectorAvailableSlotRepository } from './repositories/inspector-available-slot.repository';
import { InspectorRepository } from './repositories/inspector.repository';
import { MoveOutScheduleRepository } from './repositories/move-out-schedule.repository';
import { SemesterRepository } from './repositories/semester.repository';
import { UserConsentRepository } from './repositories/user-consent.repository';
import { UserRefreshTokenRepository } from './repositories/user-refresh-token.repository';
import { UserRepository } from './repositories/user.repository';
import { PrismaModule } from '@lib/prisma';
import { ArticleRepository } from './repositories/article.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    AuditLogRepository,
    InspectionApplicationRepository,
    InspectionSlotRepository,
    InspectionTargetInfoRepository,
    InspectorAvailableSlotRepository,
    InspectorRepository,
    MoveOutScheduleRepository,
    SemesterRepository,
    UserConsentRepository,
    UserRefreshTokenRepository,
    UserRepository,
    ArticleRepository,
  ],
  exports: [
    AuditLogRepository,
    InspectionApplicationRepository,
    InspectionSlotRepository,
    InspectionTargetInfoRepository,
    InspectorAvailableSlotRepository,
    InspectorRepository,
    MoveOutScheduleRepository,
    SemesterRepository,
    UserConsentRepository,
    UserRefreshTokenRepository,
    UserRepository,
    ArticleRepository,
  ],
})
export class DatabaseModule {}
