import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ApplicationRepository } from './application.repository';
import { Gender } from 'generated/prisma/client';
import { Loggable } from '@lib/logger';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';
import { User } from 'generated/prisma/client';
import { ApplyInspectionDto } from './dto/req/apply-inspection.dto';
import { UpdateApplicationDto } from './dto/req/update-inspection.dto';
import { InspectionResDto } from './dto/res/inspection-res.dto';
import ms from 'ms';
import { ApplicationUuidResDto } from './dto/res/application-uuid-res.dto';
import { SubmitInspectionResultDto } from './dto/req/submit-inspection-result.dto';
import { FileService } from '@lib/file';
import * as crypto from 'crypto';
import { RegisterResultResDto } from './dto/res/register-result-res.dto';
import { ApplicationListQueryDto } from './dto/req/application-list-query.dto';
import { InspectorRepository } from 'src/inspector/inspector.repository';
import {
  ApplicationListResDto,
  ApplicationResDto,
} from './dto/res/application-list-res.dto';
import { ScheduleRepository } from '../schedule/schedule.repository';
import { ScheduleService } from '../schedule/schedule.service';
import { MyInspectionTypeResDto } from './dto/res/my-inspection-type-res.dto';

@Loggable()
@Injectable()
export class ApplicationService {
  private readonly APPLICATION_UPDATE_DEADLINE = ms('1h');
  private readonly INSPECTION_COUNT_LIMIT = 3;
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly scheduleService: ScheduleService,
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService,
    private readonly inspectorRepository: InspectorRepository,
  ) {}

  async applyInspection(
    user: User,
    { inspectionSlotUuid }: ApplyInspectionDto,
  ): Promise<ApplicationUuidResDto> {
    const admissionYear = this.scheduleService.extractAdmissionYear(
      user.studentNumber,
    );

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const { schedule } =
          await this.scheduleRepository.findInspectionSlotByUuidInTx(
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
          await this.scheduleRepository.findInspectionTargetInfoByUserInfoInTx(
            admissionYear,
            user.name,
            schedule.uuid,
            tx,
          );

        if (
          inspectionTargetInfo.inspectionCount >= this.INSPECTION_COUNT_LIMIT
        ) {
          throw new ConflictException(
            'Inspection count limit(3times) exceeded.',
          );
        }

        const isMale = this.scheduleService.extractGenderFromHouseName(
          inspectionTargetInfo.houseName,
        );

        const updatedTargetInfo =
          await this.scheduleRepository.incrementInspectionCountInTx(
            inspectionTargetInfo.uuid,
            tx,
          );
        const updatedSlot =
          await this.scheduleRepository.incrementSlotReservedCountInTx(
            inspectionSlotUuid,
            isMale,
            tx,
          );

        if (isMale) {
          if (updatedSlot.maleReservedCount > updatedSlot.maleCapacity) {
            throw new ConflictException('Male capacity is already full.');
          }
        } else {
          if (updatedSlot.femaleReservedCount > updatedSlot.femaleCapacity) {
            throw new ConflictException('Female capacity is already full.');
          }
        }

        const inspector =
          await this.applicationRepository.findAvailableInspectorBySlotUuidInTx(
            user.email,
            inspectionSlotUuid,
            isMale ? Gender.MALE : Gender.FEMALE,
            tx,
          );

        const application =
          await this.applicationRepository.createInspectionApplicationInTx(
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

  async findMyInspectionTypeBySlot(
    user: User,
  ): Promise<MyInspectionTypeResDto> {
    const admissionYear = this.scheduleService.extractAdmissionYear(
      user.studentNumber,
    );

    const schedule = await this.scheduleRepository.findActiveSchedule();

    const targetInfo =
      await this.scheduleRepository.findInspectionTargetInfoByUserInfo(
        admissionYear,
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
    return this.prismaService.$transaction(async (tx: PrismaTransaction) => {
      const application =
        await this.applicationRepository.findApplicationByUuidWithXLockInTx(
          applicationUuid,
          tx,
        );

      if (application.isPassed !== null) {
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

      await this.applicationRepository.deleteInspectionApplicationInTx(
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

      const isMale = this.scheduleService.extractGenderFromHouseName(
        application.inspectionTargetInfo.houseName,
      );

      await this.scheduleRepository.swapSlotReservedCountsInTx(
        application.inspectionSlotUuid,
        inspectionSlotUuid,
        isMale,
        tx,
      );

      const updatedSlot = await this.scheduleRepository.findSlotByUuidInTx(
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

      if (isMale) {
        if (updatedSlot.maleReservedCount > updatedSlot.maleCapacity) {
          throw new ConflictException('Male capacity is already full.');
        }
      } else {
        if (updatedSlot.femaleReservedCount > updatedSlot.femaleCapacity) {
          throw new ConflictException('Female capacity is already full.');
        }
      }

      const inspector =
        await this.applicationRepository.findAvailableInspectorBySlotUuidInTx(
          user.email,
          inspectionSlotUuid,
          isMale ? Gender.MALE : Gender.FEMALE,
          tx,
        );

      const updatedApplication =
        await this.applicationRepository.createInspectionApplicationInTx(
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
    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const application =
          await this.applicationRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (application.isPassed !== null) {
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
          await this.scheduleRepository.decrementInspectionCountInTx(
            application.inspectionTargetInfo.uuid,
            tx,
          );
        }

        const isMale = this.scheduleService.extractGenderFromHouseName(
          application.inspectionTargetInfo.houseName,
        );

        await this.scheduleRepository.decrementSlotReservedCountInTx(
          application.inspectionSlotUuid,
          isMale,
          tx,
        );

        await this.applicationRepository.deleteInspectionApplicationInTx(
          application.uuid,
          tx,
        );
      },
    );
  }

  async findMyInspection(user: User): Promise<InspectionResDto> {
    const schedule = await this.scheduleRepository.findActiveSchedule();
    const application =
      await this.applicationRepository.findApplicationByUserAndSchedule(
        user.uuid,
        schedule.uuid,
      );

    return {
      uuid: application.uuid,
      inspectionSlot: { ...application.inspectionSlot },
      isPassed: application.isPassed ?? undefined,
    };
  }

  async findApplication(uuid: string): Promise<ApplicationResDto> {
    const application =
      await this.applicationRepository.findApplicationByUuid(uuid);

    return new ApplicationResDto({
      ...application,
      document:
        application.document === null
          ? null
          : await this.fileService.getUrl(application.document),
    });
  }

  async submitInspectionResult(
    { email, name, studentNumber }: User,
    applicationUuid: string,
    { passed, failed, contentLength }: SubmitInspectionResultDto,
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

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const application =
          await this.applicationRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (application.inspectorUuid !== inspector.uuid) {
          throw new ForbiddenException(
            'The inspector is not assigned to this application.',
          );
        }

        if (application.isPassed !== null) {
          throw new ConflictException(
            'Inspection result has already been submitted and cannot be modified.',
          );
        }

        await this.applicationRepository.updateInspectionResultInTx(
          applicationUuid,
          { passed, failed },
          failed.length === 0,
          key,
          false,
          tx,
        );
        return { presignedUrl };
      },
    );
  }

  async verifyInspectionDocument(applicationUuid: string): Promise<void> {
    const application =
      await this.applicationRepository.findApplicationByUuid(applicationUuid);

    if (!application.document) {
      throw new BadRequestException(
        'No document associated with this application.',
      );
    }

    await this.fileService.verifyFileExists(application.document);

    await this.applicationRepository.updateDocumentActiveStatus(
      applicationUuid,
      true,
    );
  }

  async findApplicationsByScheduleUuid(
    { offset, limit }: ApplicationListQueryDto,
    scheduleUuid: string,
  ): Promise<ApplicationListResDto> {
    const [applications, totalCount] = await Promise.all([
      this.applicationRepository.findApplicationsByScheduleUuid(
        offset ?? 0,
        limit ?? 20,
        scheduleUuid,
      ),
      this.applicationRepository.countApplications(scheduleUuid),
    ]);
    return new ApplicationListResDto(
      await Promise.all(
        applications.map(async (app) => ({
          ...app,
          document:
            app.document === null
              ? null
              : await this.fileService.getUrl(app.document),
        })),
      ),
      totalCount,
    );
  }
}
