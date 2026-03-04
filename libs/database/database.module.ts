import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from './src/repositories/audit-log.repository';
import { InspectionApplicationRepository } from './src/repositories/inspection-application.repository';
import { InspectionSlotRepository } from './src/repositories/inspection-slot.repository';
import { InspectionTargetInfoRepository } from './src/repositories/inspection-target-info.repository';
import { InspectorAvailableSlotRepository } from './src/repositories/inspector-available-slot.repository';
import { InspectorRepository } from './src/repositories/inspector.repository';
import { MoveOutScheduleRepository } from './src/repositories/move-out-schedule.repository';
import { SemesterRepository } from './src/repositories/semester.repository';
import { UserConsentRepository } from './src/repositories/user-consent.repository';
import { UserRefreshTokenRepository } from './src/repositories/user-refresh-token.repository';
import { UserRepository } from './src/repositories/user.repository';
import { PrismaModule } from '@lib/prisma';

@Global()
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
  ],
})
export class DatabaseModule {}
