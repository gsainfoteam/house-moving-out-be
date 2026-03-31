import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Loggable } from '@lib/logger';
import { DatabaseService, PrismaTransaction } from '@lib/database';
import {
  ApplicationStatus,
  ScheduleStatus,
  User,
} from 'generated/prisma/client';
import { ApplyInspectionDto } from './dto/req/apply-inspection.dto';
import { UpdateApplicationDto } from './dto/req/update-inspection.dto';
import { InspectionResDto } from './dto/res/inspection-res.dto';
import ms from 'ms';
import { ApplicationUuidResDto } from './dto/res/application-uuid-res.dto';
import { SubmitInspectionResultDto } from './dto/req/submit-inspection-result.dto';
import { FileService } from '@lib/file';
import * as crypto from 'crypto';
import { RegisterResultResDto } from './dto/res/register-result-res.dto';
import { ApplicationResDto } from './dto/res/application-res.dto';
import { MyInspectionTypeResDto } from './dto/res/my-inspection-type-res.dto';
import { GetDocumentUploadUrlReqDto } from './dto/req/get-document-upload-url.dto';
import {
  InspectionApplicationRepository,
  InspectionSlotRepository,
  InspectionTargetInfoRepository,
  MoveOutScheduleRepository,
  InspectorRepository,
} from '@lib/database';
import { TargetPhoneNumberResDto } from './dto/res/target-phone-number-res.dto';
import { ChangeAssignedInspectorDto } from './dto/req/change-assigned-inspector.dto';

@Loggable()
@Injectable()
export class ApplicationService {
  private readonly APPLICATION_UPDATE_DEADLINE = ms('1h');
  private readonly INSPECTION_COUNT_LIMIT = 3;
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FileService,
    private readonly inspectorRepository: InspectorRepository,
    private readonly inspectionApplicationRepository: InspectionApplicationRepository,
    private readonly inspectionSlotRepository: InspectionSlotRepository,
    private readonly inspectionTargetInfoRepository: InspectionTargetInfoRepository,
    private readonly moveOutScheduleRepository: MoveOutScheduleRepository,
  ) {}

  async applyInspection(
    user: User,
    { inspectionSlotUuid }: ApplyInspectionDto,
  ): Promise<ApplicationUuidResDto> {
    return await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const { schedule } =
          await this.inspectionSlotRepository.findInspectionSlotByUuidInTx(
            inspectionSlotUuid,
            tx,
          );

        const now = new Date();
        if (now < schedule.applicationStartTime) {
          throw new ForbiddenException(
            'Application period has not started yet.',
          );
        }

        if (now > schedule.applicationEndTime) {
          throw new ForbiddenException('Application period has ended.');
        }

        const inspectionTargetInfo =
          await this.inspectionTargetInfoRepository.findInspectionTargetInfoByUserInfoInTx(
            user.studentNumber,
            user.name,
            schedule.uuid,
            tx,
          );

        if (inspectionTargetInfo.applyCleaningService) {
          throw new ForbiddenException(
            'Cannot apply for inspection while applying for cleaning service.',
          );
        }

        if (
          inspectionTargetInfo.inspectionCount >= this.INSPECTION_COUNT_LIMIT
        ) {
          throw new ConflictException(
            'Inspection count limit(3times) exceeded.',
          );
        }

        const updatedTargetInfo =
          await this.inspectionTargetInfoRepository.incrementInspectionCountInTx(
            inspectionTargetInfo.uuid,
            tx,
          );
        const updatedSlot =
          await this.inspectionSlotRepository.incrementSlotReservedCountInTx(
            inspectionSlotUuid,
            tx,
          );

        if (updatedSlot.gender !== inspectionTargetInfo.gender) {
          throw new BadRequestException('Inspection slot gender mismatch.');
        }
        if (updatedSlot.reservedCount > updatedSlot.capacity) {
          throw new ConflictException('Slot capacity is already full.');
        }

        const inspector =
          await this.inspectorRepository.findAvailableInspectorBySlotUuidInTx(
            user.email,
            inspectionSlotUuid,
            inspectionTargetInfo.gender,
            tx,
          );

        const application =
          await this.inspectionApplicationRepository.createInspectionApplicationInTx(
            user.uuid,
            inspectionTargetInfo.uuid,
            inspectionSlotUuid,
            inspector.uuid,
            updatedTargetInfo.inspectionCount,
            tx,
          );

        return { applicationUuid: application.uuid };
      },
    );
  }

  async findMyInspectionType(user: User): Promise<MyInspectionTypeResDto> {
    const schedule = await this.moveOutScheduleRepository.findActiveSchedule();

    const targetInfo =
      await this.inspectionTargetInfoRepository.findInspectionTargetInfoByUserInfo(
        user.studentNumber,
        user.name,
        schedule.uuid,
      );

    return new MyInspectionTypeResDto(targetInfo);
  }

  async updateApplication(
    user: User,
    applicationUuid: string,
    { inspectionSlotUuid }: UpdateApplicationDto,
  ): Promise<ApplicationUuidResDto> {
    return this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      const application =
        await this.inspectionApplicationRepository.findApplicationByUuidWithXLockInTx(
          applicationUuid,
          tx,
        );

      if (application.status !== null) {
        throw new BadRequestException(
          'Cannot update an application that has already executed.',
        );
      }

      if (application.userUuid !== user.uuid) {
        throw new ForbiddenException(
          'The application does not belong to this user.',
        );
      }

      if (application.inspectionSlotUuid === inspectionSlotUuid) {
        return { applicationUuid };
      }

      await this.inspectionApplicationRepository.deleteInspectionApplicationInTx(
        applicationUuid,
        tx,
      );

      const now = new Date();
      const timeDiff =
        application.inspectionSlot.startTime.getTime() - now.getTime();

      if (timeDiff < this.APPLICATION_UPDATE_DEADLINE) {
        throw new ForbiddenException(
          'Cannot modify the inspection time within 1 hour of the start time.',
        );
      }

      await this.inspectionSlotRepository.swapSlotReservedCountsInTx(
        application.inspectionSlotUuid,
        inspectionSlotUuid,
        tx,
      );

      const updatedSlot =
        await this.inspectionSlotRepository.findSlotByUuidInTx(
          inspectionSlotUuid,
          tx,
        );

      if (
        application.inspectionSlot.scheduleUuid !== updatedSlot.scheduleUuid
      ) {
        throw new BadRequestException(
          'Changes are only possible within the same schedule.',
        );
      }

      if (updatedSlot.gender !== application.inspectionTargetInfo.gender) {
        throw new BadRequestException('Inspection slot gender mismatch.');
      }
      if (updatedSlot.reservedCount > updatedSlot.capacity) {
        throw new ConflictException('Slot capacity is already full.');
      }

      const inspector =
        await this.inspectorRepository.findAvailableInspectorBySlotUuidInTx(
          user.email,
          inspectionSlotUuid,
          application.inspectionTargetInfo.gender,
          tx,
        );

      const updatedApplication =
        await this.inspectionApplicationRepository.createInspectionApplicationInTx(
          user.uuid,
          application.inspectionTargetInfoUuid,
          inspectionSlotUuid,
          inspector.uuid,
          application.inspectionCount,
          tx,
        );

      return { applicationUuid: updatedApplication.uuid };
    });
  }

  async cancelInspection(user: User, applicationUuid: string): Promise<void> {
    return await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const application =
          await this.inspectionApplicationRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (application.status !== null) {
          throw new BadRequestException(
            'Cannot cancel an application that has already executed.',
          );
        }

        if (application.userUuid !== user.uuid) {
          throw new ForbiddenException(
            'The application does not belong to this user.',
          );
        }

        const now = new Date();
        const timeDiff =
          application.inspectionSlot.startTime.getTime() - now.getTime();

        if (timeDiff >= this.APPLICATION_UPDATE_DEADLINE) {
          await this.inspectionTargetInfoRepository.decrementInspectionCountInTx(
            application.inspectionTargetInfo.uuid,
            tx,
          );
        }

        await this.inspectionSlotRepository.decrementSlotReservedCountInTx(
          application.inspectionSlotUuid,
          tx,
        );

        await this.inspectionApplicationRepository.deleteInspectionApplicationInTx(
          application.uuid,
          tx,
        );
      },
    );
  }

  async changeAssignedInspector(
    applicationUuid: string,
    { inspectorUuid, targetApplicationUuid }: ChangeAssignedInspectorDto,
  ): Promise<void> {
    return await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const inspector = await this.inspectorRepository.findInspectorInTx(
          inspectorUuid,
          tx,
        );
        const application =
          await this.inspectionApplicationRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (
          !inspector.availableSlots.find(
            (slot) =>
              slot.inspectionSlotUuid === application.inspectionSlotUuid,
          )
        ) {
          throw new ForbiddenException(
            "The inspector is not available for the application's inspection slot.",
          );
        }

        const schedule =
          await this.moveOutScheduleRepository.findMoveOutScheduleWithSlotsByUuid(
            application.inspectionSlot.scheduleUuid,
          );

        if (schedule.status !== ScheduleStatus.ACTIVE) {
          throw new ForbiddenException(
            'Can only change assigned inspector for active schedules.',
          );
        }

        if (!targetApplicationUuid) {
          if (inspector.applications.length == 2) {
            throw new ConflictException(
              'The inspector is already assigned to too many applications.',
            );
          }
          await this.inspectionApplicationRepository.updateAssignedInspectorInTx(
            applicationUuid,
            inspectorUuid,
            tx,
          );
        } else {
          const targetApplication =
            await this.inspectionApplicationRepository.findApplicationByUuidWithXLockInTx(
              targetApplicationUuid,
              tx,
            );

          if (
            targetApplication.inspectionSlotUuid !==
            application.inspectionSlotUuid
          ) {
            throw new ForbiddenException(
              'The target application is not in the same inspection slot.',
            );
          }
          if (targetApplication.inspectorUuid !== inspectorUuid) {
            throw new ForbiddenException(
              'The target application is not assigned to the specified inspector.',
            );
          }

          await this.inspectionApplicationRepository.updateAssignedInspectorInTx(
            targetApplicationUuid,
            application.inspectorUuid,
            tx,
          );
          await this.inspectionApplicationRepository.updateAssignedInspectorInTx(
            applicationUuid,
            inspectorUuid,
            tx,
          );
        }
      },
    );
  }

  async findMyInspection(user: User): Promise<InspectionResDto> {
    const schedule = await this.moveOutScheduleRepository.findActiveSchedule();
    const application =
      await this.inspectionApplicationRepository.findApplicationByUserAndSchedule(
        user.uuid,
        schedule.uuid,
      );

    return {
      uuid: application.uuid,
      inspectionSlot: { ...application.inspectionSlot },
      status: application.status ?? undefined,
      inspectionCount: application.inspectionCount,
      itemResults: application.itemResults,
    };
  }

  async findApplication(uuid: string): Promise<ApplicationResDto> {
    const application =
      await this.inspectionApplicationRepository.findApplicationByUuid(uuid);

    return new ApplicationResDto({
      ...application,
      document:
        application.document === null
          ? null
          : await this.fileService.getUrl(application.document),
    });
  }

  async recordTargetNoShow(
    { email, name, studentNumber }: User,
    applicationUuid: string,
    status: ApplicationStatus,
  ): Promise<TargetPhoneNumberResDto> {
    const inspector = await this.inspectorRepository.findInspectorByUserInfo(
      email,
      name,
      studentNumber,
    );

    return await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const application =
          await this.inspectionApplicationRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (application.inspectorUuid !== inspector.uuid) {
          throw new ForbiddenException(
            'The inspector is not assigned to this application.',
          );
        }

        if (
          application.status !== null &&
          application.status !== ApplicationStatus.PENDING_NO_SHOW
        ) {
          throw new ConflictException(
            'Inspection result has already been submitted and cannot be modified.',
          );
        }

        if (
          status === ApplicationStatus.NO_SHOW &&
          application.status !== ApplicationStatus.PENDING_NO_SHOW
        ) {
          throw new ForbiddenException(
            'Only PENDING_NO_SHOW status can be updated to NO_SHOW.',
          );
        }

        const applicationWithUser =
          await this.inspectionApplicationRepository.updateApplicationStatusInTx(
            applicationUuid,
            status,
            tx,
          );
        return {
          targetPhoneNumber:
            status === ApplicationStatus.PENDING_NO_SHOW
              ? applicationWithUser.user.phoneNumber
              : undefined,
        };
      },
    );
  }

  async submitInspectionResult(
    { email, name, studentNumber }: User,
    applicationUuid: string,
    {
      passed,
      failed,
      contentLength,
      additionalComment,
    }: SubmitInspectionResultDto,
  ): Promise<RegisterResultResDto> {
    if (passed.length === 0 && failed.length === 0) {
      throw new BadRequestException(
        'At least one inspection item result (passed or failed) is required.',
      );
    }

    const overlap = passed.filter((slug) => failed.includes(slug));

    if (overlap.length > 0) {
      throw new BadRequestException(
        'Passed and failed items must not overlap.',
      );
    }

    const key = `application/${applicationUuid}/application_${crypto.randomBytes(16).toString('base64url')}.pdf`;
    const presignedUrl = await this.fileService.createPresignedUrl(
      key,
      contentLength,
    );

    const inspector = await this.inspectorRepository.findInspectorByUserInfo(
      email,
      name,
      studentNumber,
    );

    return await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const application =
          await this.inspectionApplicationRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (application.inspectorUuid !== inspector.uuid) {
          throw new ForbiddenException(
            'The inspector is not assigned to this application.',
          );
        }

        if (
          application.status !== null &&
          application.status !== ApplicationStatus.PENDING_NO_SHOW
        ) {
          throw new ConflictException(
            'Inspection result has already been submitted and cannot be modified.',
          );
        }

        await this.inspectionApplicationRepository.updateInspectionResultInTx(
          applicationUuid,
          { passed, failed },
          additionalComment ?? null,
          failed.length === 0
            ? ApplicationStatus.PASSED
            : ApplicationStatus.FAILED,
          key,
          false,
          tx,
        );
        return { presignedUrl };
      },
    );
  }

  async getDocumentUploadUrl(
    { email, name, studentNumber }: User,
    applicationUuid: string,
    { contentLength }: GetDocumentUploadUrlReqDto,
  ): Promise<RegisterResultResDto> {
    const inspector = await this.inspectorRepository.findInspectorByUserInfo(
      email,
      name,
      studentNumber,
    );

    const application =
      await this.inspectionApplicationRepository.findApplicationByUuid(
        applicationUuid,
      );

    if (application.inspectorUuid !== inspector.uuid) {
      throw new ForbiddenException(
        'The inspector is not assigned to this application.',
      );
    }

    if (
      application.status !== ApplicationStatus.PASSED &&
      application.status !== ApplicationStatus.FAILED
    ) {
      throw new BadRequestException(
        'Inspection result must be submitted before requesting document upload URL.',
      );
    }

    if (!application.document) {
      throw new BadRequestException(
        'No document associated with this application.',
      );
    }

    if (application.isDocumentActive) {
      throw new ConflictException(
        'Inspection document has already been verified and cannot be re-uploaded.',
      );
    }

    const presignedUrl = await this.fileService.createPresignedUrl(
      application.document,
      contentLength,
    );

    return { presignedUrl };
  }

  async verifyInspectionDocument(
    user: User,
    applicationUuid: string,
  ): Promise<void> {
    const application =
      await this.inspectionApplicationRepository.findApplicationByUuid(
        applicationUuid,
      );
    const inspector = await this.inspectorRepository.findInspectorByUserInfo(
      user.email,
      user.name,
      user.studentNumber,
    );

    if (application.inspectorUuid !== inspector.uuid) {
      throw new ForbiddenException(
        'The inspector is not assigned to this application.',
      );
    }

    if (!application.document) {
      throw new BadRequestException(
        'No document associated with this application.',
      );
    }

    await this.fileService.verifyFileExists(application.document);

    await this.inspectionApplicationRepository.updateDocumentActiveStatus(
      applicationUuid,
      true,
    );
  }
}
