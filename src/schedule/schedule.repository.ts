import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import {
  MoveOutSchedule,
  Semester,
  Season,
  Prisma,
  ScheduleStatus,
  InspectionSlot,
  InspectionTargetInfo,
} from 'generated/prisma/client';
import { PrismaTransaction } from 'src/common/types';
import { MoveOutScheduleWithSlots } from './types/move-out-schedule-with-slots.type';
import { Loggable } from '@lib/logger';
import { InspectorWithSlots } from 'src/inspector/types/inspector-with-slots.type';
import { InspectionTargetStudent } from './types/inspection-target.type';
import { InspectionTargetInfoWithApplication } from './types/inspection-target-info-with-application.type';
import { ApplicationInfo } from 'src/application/types/application-info.type';

@Loggable()
@Injectable()
export class ScheduleRepository {
  private readonly logger = new Logger(ScheduleRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async findAllMoveOutSchedules(): Promise<MoveOutSchedule[]> {
    return await this.prismaService.moveOutSchedule
      .findMany()
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findAllMoveOutSchedules prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAllMoveOutSchedules error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createMoveOutScheduleInTx(
    scheduleData: Pick<
      MoveOutSchedule,
      | 'title'
      | 'applicationStartTime'
      | 'applicationEndTime'
      | 'currentSemesterUuid'
      | 'nextSemesterUuid'
    >,
    slotsData: Prisma.InspectionSlotCreateManyScheduleInput[],
    tx: PrismaTransaction,
  ): Promise<MoveOutSchedule> {
    return await tx.moveOutSchedule
      .create({
        data: {
          ...scheduleData,
          inspectionSlots: {
            createMany: {
              data: slotsData,
            },
          },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException('Move out schedule already exists.');
          }
          this.logger.error(
            `createMoveOutScheduleInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createMoveOutScheduleInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findMoveOutScheduleWithSlotsByUuid(
    uuid: string,
  ): Promise<MoveOutScheduleWithSlots> {
    return await this.prismaService.moveOutSchedule
      .findUniqueOrThrow({
        where: { uuid },
        include: {
          inspectionSlots: true,
          currentSemester: true,
          nextSemester: true,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${uuid}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `findMoveOutScheduleWithSlotsByUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findMoveOutScheduleWithSlotsByUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findActiveMoveOutScheduleWithSlots(): Promise<MoveOutScheduleWithSlots> {
    return await this.prismaService.moveOutSchedule
      .findFirstOrThrow({
        where: { status: ScheduleStatus.ACTIVE },
        include: {
          inspectionSlots: true,
          currentSemester: true,
          nextSemester: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Active MoveOutSchedule not found`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `findActiveMoveOutScheduleWithSlots prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findActiveMoveOutScheduleWithSlots error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectorByScheduleUuid(
    uuid: string,
  ): Promise<InspectorWithSlots[]> {
    return await this.prismaService.inspector
      .findMany({
        where: {
          availableSlots: {
            some: {
              inspectionSlot: { scheduleUuid: uuid },
            },
          },
        },
        include: {
          availableSlots: {
            include: {
              inspectionSlot: true,
            },
          },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findInspectorByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspectorByScheduleUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationsByScheduleUuid(
    offset: number,
    limit: number,
    scheduleUuid: string,
  ): Promise<ApplicationInfo[]> {
    return await this.prismaService.inspectionApplication
      .findMany({
        where: {
          inspectionSlot: {
            scheduleUuid,
          },
          deletedAt: null,
        },
        include: {
          user: true,
          inspectionSlot: true,
          inspector: true,
          inspectionTargetInfo: true,
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findApplicationsByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findApplicationsByScheduleUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async countApplications(scheduleUuid: string): Promise<number> {
    return await this.prismaService.inspectionApplication
      .count({
        where: {
          inspectionSlot: {
            scheduleUuid,
          },
          deletedAt: null,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`countApplications prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`countApplications error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findOrCreateSemester(year: number, season: Season): Promise<Semester> {
    return await this.prismaService.semester
      .upsert({
        where: {
          year_season: {
            year,
            season,
          },
        },
        update: {},
        create: {
          year,
          season,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findOrCreateSemester prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findOrCreateSemester error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionSlotByUuidInTx(
    slotUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionSlot & { schedule: MoveOutSchedule }> {
    return await tx.inspectionSlot
      .findUniqueOrThrow({
        where: { uuid: slotUuid },
        include: { schedule: true },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionSlot not found: ${slotUuid}`);
            throw new NotFoundException('Inspection slot not found.');
          }
          this.logger.error(
            `findInspectionSlotByUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspectionSlotByUuidInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findSlotByUuidInTx(
    slotUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionSlot> {
    return await tx.inspectionSlot
      .findUniqueOrThrow({
        where: { uuid: slotUuid },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionSlot not found: ${slotUuid}`);
            throw new NotFoundException('Inspection slot not found.');
          }
          this.logger.error(
            `findSlotByUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findSlotByUuidInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async incrementSlotReservedCountInTx(
    slotUuid: string,
    isMale: boolean,
    tx: PrismaTransaction,
  ): Promise<InspectionSlot> {
    return await tx.inspectionSlot
      .update({
        where: { uuid: slotUuid },
        data: {
          maleReservedCount: isMale
            ? {
                increment: 1,
              }
            : undefined,
          femaleReservedCount: !isMale
            ? {
                increment: 1,
              }
            : undefined,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionSlot not found: ${slotUuid}`);
            throw new NotFoundException('Inspection slot not found.');
          }
          this.logger.error(
            `incrementSlotReservedCountInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`incrementSlotReservedCountInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async decrementSlotReservedCountInTx(
    slotUuid: string,
    isMale: boolean,
    tx: PrismaTransaction,
  ): Promise<InspectionSlot> {
    return await tx.inspectionSlot
      .update({
        where: { uuid: slotUuid },
        data: {
          maleReservedCount: isMale
            ? {
                increment: -1,
              }
            : undefined,
          femaleReservedCount: !isMale
            ? {
                increment: -1,
              }
            : undefined,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionSlot not found: ${slotUuid}`);
            throw new NotFoundException('Inspection slot not found.');
          }
          this.logger.error(
            `decrementSlotReservedCountInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`decrementSlotReservedCountInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async swapSlotReservedCountsInTx(
    currentSlotUuid: string,
    updatedSlotUuid: string,
    isMale: boolean,
    tx: PrismaTransaction,
  ): Promise<void> {
    const affected_slots_count = await tx.$executeRaw<number>`
      UPDATE inspection_slot
      SET
        male_reserved_count = CASE
          WHEN ${isMale} = TRUE AND uuid = ${currentSlotUuid} THEN male_reserved_count - 1
          WHEN ${isMale} = TRUE AND uuid = ${updatedSlotUuid} THEN male_reserved_count + 1
          ELSE male_reserved_count
        END,
        female_reserved_count = CASE
          WHEN ${isMale} = FALSE AND uuid = ${currentSlotUuid} THEN female_reserved_count - 1
          WHEN ${isMale} = FALSE AND uuid = ${updatedSlotUuid} THEN female_reserved_count + 1
          ELSE female_reserved_count
        END
      WHERE uuid IN (${currentSlotUuid}, ${updatedSlotUuid});
    `.catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          `swapSlotReservedCountsInTx prisma error: ${error.message}`,
        );
        throw new InternalServerErrorException('Database Error');
      }
      this.logger.error(`swapSlotReservedCountsInTx error: ${error}`);
      throw new InternalServerErrorException('Unknown Error');
    });
    if (affected_slots_count !== 2) {
      this.logger.debug('InspectionSlot not found');
      throw new NotFoundException('Inspection slot not found.');
    }
  }

  async findActiveSchedule(): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .findFirstOrThrow({
        where: { status: ScheduleStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('Activated MoveOut-Schedule not found');
            throw new NotFoundException('Not Found Error');
          }
          this.logger.error(
            `findActiveSchedule prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findActiveSchedule error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findMoveOutScheduleWithSlotsByUuidWithXLockInTx(
    uuid: string,
    tx: PrismaTransaction,
  ): Promise<MoveOutSchedule & { inspectionSlots: InspectionSlot[] }> {
    await tx.$executeRaw`SELECT 1 FROM "move_out_schedule" WHERE "uuid" = ${uuid} FOR UPDATE`;

    return await tx.moveOutSchedule
      .findUniqueOrThrow({
        where: { uuid },
        include: {
          inspectionSlots: true,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${uuid}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `findMoveOutScheduleWithSlotsByUuidWithXLockInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findMoveOutScheduleWithSlotsByUuidWithXLockInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async countInspectionTargetsByScheduleAndUuidsInTx(
    scheduleUuid: string,
    targetUuids: string[],
    tx: PrismaTransaction,
  ): Promise<number> {
    return await tx.inspectionTargetInfo
      .count({
        where: {
          scheduleUuid,
          uuid: { in: targetUuids },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `countInspectionTargetsByScheduleAndUuids prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `countInspectionTargetsByScheduleAndUuids error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspectionTargetsByScheduleUuidInTx(
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .deleteMany({
        where: { scheduleUuid },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteInspectionTargetsByScheduleUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `deleteInspectionTargetsByScheduleUuidInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateSlotCapacitiesByScheduleUuidInTx(
    scheduleUuid: string,
    maleCapacity: number,
    femaleCapacity: number,
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionSlot
      .updateMany({
        where: { scheduleUuid },
        data: { maleCapacity, femaleCapacity },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `updateSlotCapacitiesByScheduleUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `updateSlotCapacitiesByScheduleUuidInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectionTargetsInTx(
    scheduleUuid: string,
    inspectionTargetInfos: InspectionTargetStudent[],
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .createMany({
        data: inspectionTargetInfos.map((target) => ({
          scheduleUuid,
          houseName: target.houseName,
          roomNumber: target.roomNumber,
          student1Name: target.students[0]?.studentName,
          student1AdmissionYear: target.students[0]?.admissionYear,
          student2Name: target.students[1]?.studentName,
          student2AdmissionYear: target.students[1]?.admissionYear,
          student3Name: target.students[2]?.studentName,
          student3AdmissionYear: target.students[2]?.admissionYear,
          applyCleaningService: target.applyCleaningService ?? false,
          inspectionType: target.inspectionType,
        })),
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException(
              'Duplicate inspection target room exists in the given schedule.',
            );
          }
          this.logger.error(
            `createInspectionTargetsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectionTargetsInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateApplyCleaningServiceByScheduleAndUuidsInTx(
    scheduleUuid: string,
    targetUuids: string[],
    applyCleaningService: boolean,
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .updateMany({
        where: {
          scheduleUuid,
          uuid: { in: targetUuids },
        },
        data: { applyCleaningService },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `updateApplyCleaningServiceByScheduleAndUuids prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `updateApplyCleaningServiceByScheduleAndUuids error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionTargetInfoByUserInfo(
    admissionYear: string,
    studentName: string,
    scheduleUuid: string,
  ): Promise<InspectionTargetInfo> {
    return await this.prismaService.inspectionTargetInfo
      .findFirstOrThrow({
        where: {
          scheduleUuid,
          OR: [
            {
              student1AdmissionYear: admissionYear,
              student1Name: studentName,
            },
            {
              student2AdmissionYear: admissionYear,
              student2Name: studentName,
            },
            {
              student3AdmissionYear: admissionYear,
              student3Name: studentName,
            },
          ],
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new ForbiddenException('User is not an inspection target.');
          }
          this.logger.error(
            `findInspectionTargetInfoByUserInfo prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspectionTargetInfoByUserInfo error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionTargetInfoByUserInfoInTx(
    admissionYear: string,
    studentName: string,
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    return await tx.inspectionTargetInfo
      .findFirstOrThrow({
        where: {
          scheduleUuid,
          OR: [
            {
              student1AdmissionYear: admissionYear,
              student1Name: studentName,
            },
            {
              student2AdmissionYear: admissionYear,
              student2Name: studentName,
            },
            {
              student3AdmissionYear: admissionYear,
              student3Name: studentName,
            },
          ],
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new ForbiddenException('User is not an inspection target.');
          }
          this.logger.error(
            `findInspectionTargetInfoByUserInfoInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findInspectionTargetInfoByUserInfoInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async incrementInspectionCountInTx(
    targetUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    return await tx.inspectionTargetInfo
      .update({
        where: { uuid: targetUuid },
        data: {
          inspectionCount: { increment: 1 },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionTargetInfo not found: ${targetUuid}`);
            throw new NotFoundException('Inspection target info not found.');
          }
          this.logger.error(
            `incrementInspectionCountInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`incrementInspectionCountInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async decrementInspectionCountInTx(
    targetUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    return await tx.inspectionTargetInfo
      .update({
        where: { uuid: targetUuid },
        data: {
          inspectionCount: { increment: -1 },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionTargetInfo not found: ${targetUuid}`);
            throw new NotFoundException('Inspection target info not found.');
          }
          this.logger.error(
            `decrementInspectionCountInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`decrementInspectionCountInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid(
    scheduleUuid: string,
  ): Promise<InspectionTargetInfoWithApplication[]> {
    return await this.prismaService.inspectionTargetInfo
      .findMany({
        where: {
          scheduleUuid,
        },
        include: {
          inspectionApplication: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 2,
            include: {
              inspectionSlot: true,
            },
          },
        },
        orderBy: [{ houseName: 'asc' }, { roomNumber: 'asc' }],
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
