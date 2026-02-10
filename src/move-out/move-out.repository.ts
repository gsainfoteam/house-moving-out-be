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
  InspectionTargetInfo,
  MoveOutSchedule,
  Semester,
  Season,
  Prisma,
  InspectionSlot,
  InspectionApplication,
  Gender,
  Inspector,
  ScheduleStatus,
} from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateMoveOutScheduleDto } from './dto/req/update-move-out-schedule.dto';
import { InspectionTargetStudent } from './types/inspection-target.type';
import { PrismaTransaction } from 'src/common/types';
import { MoveOutScheduleWithSlots } from './types/move-out-schedule-with-slots.type';
import { InspectionApplicationWithDetails } from './types/inspection-application-with-details.type';
import { Loggable } from '@lib/logger';
import { InspectorWithSlots } from 'src/inspector/types/inspector-with-slots.type';

@Loggable()
@Injectable()
export class MoveOutRepository {
  private readonly logger = new Logger(MoveOutRepository.name);
  private readonly MAX_APPLICATIONS_PER_INSPECTOR = 2;
  constructor(private readonly prismaService: PrismaService) {}

  async findAllMoveOutSchedules(): Promise<MoveOutSchedule[]> {
    return await this.prismaService.moveOutSchedule
      .findMany()
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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

  async findMoveOutScheduleBySemesterUuids(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .findFirstOrThrow({
        where: {
          currentSemesterUuid,
          nextSemesterUuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(
              `MoveOutSchedule not found for semesters: ${currentSemesterUuid}, ${nextSemesterUuid}`,
            );
            throw new NotFoundException(
              'Schedule not found for the given semesters.',
            );
          }
          this.logger.error(
            `findMoveOutScheduleBySemesterUuids prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findMoveOutScheduleBySemesterUuids error: ${error}`);
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findInspectorByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspectorByScheduleUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateMoveOutSchedule(
    uuid: string,
    moveOutSchedule: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .update({
        where: { uuid },
        data: moveOutSchedule,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${uuid}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `updateMoveOutSchedule prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateMoveOutSchedule error: ${error}`);
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
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findOrCreateSemester prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findOrCreateSemester error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findSemesterByYearAndSeason(
    year: number,
    season: Season,
  ): Promise<Semester> {
    return await this.prismaService.semester
      .findUniqueOrThrow({
        where: {
          year_season: {
            year,
            season,
          },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(
              `Semester not found: year=${year}, season=${season}`,
            );
            throw new NotFoundException('Semester not found.');
          }
          this.logger.error(
            `findSemesterByYearAndSeason prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findSemesterByYearAndSeason error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionTargetInfosByScheduleUuid(
    scheduleUuid: string,
  ): Promise<InspectionTargetInfo[]> {
    return await this.prismaService.inspectionTargetInfo
      .findMany({
        where: { scheduleUuid },
        orderBy: [{ houseName: 'asc' }, { roomNumber: 'asc' }],
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findInspectionTargetInfosByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findInspectionTargetInfosByScheduleUuid error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspectionTargetInfosByScheduleUuid(
    scheduleUuid: string,
  ): Promise<{ count: number }> {
    return await this.prismaService.inspectionTargetInfo
      .deleteMany({
        where: { scheduleUuid },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteInspectionTargetInfosByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `deleteInspectionTargetInfosByScheduleUuid error: ${error}`,
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
          ...target,
        })),
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException(
              'Duplicate inspection target exists in the given schedule.',
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

  async findInspectionTargetInfoByUserInfo(
    admissionYear: string,
    studentName: string,
    scheduleUuid: string,
  ): Promise<InspectionTargetInfo> {
    return await this.prismaService.inspectionTargetInfo
      .findUniqueOrThrow({
        where: {
          inspection_target_with_schedule: {
            scheduleUuid,
            admissionYear,
            studentName,
          },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
      .findUniqueOrThrow({
        where: {
          inspection_target_with_schedule: {
            scheduleUuid,
            admissionYear,
            studentName,
          },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
        if (error instanceof PrismaClientKnownRequestError) {
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
      if (error instanceof PrismaClientKnownRequestError) {
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

  async createInspectionApplicationInTx(
    userUuid: string,
    inspectionTargetInfoUuid: string,
    inspectionSlotUuid: string,
    inspectorUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionApplication> {
    return await tx.inspectionApplication
      .create({
        data: {
          userUuid,
          inspectionTargetInfoUuid,
          inspectionSlotUuid,
          inspectorUuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException(
              'Inspection application already exists.',
            );
          }
          this.logger.error(
            `createInspectionApplicationInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectionApplicationInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspectionApplicationInTx(
    applicationUuid: string,
    tx: PrismaTransaction,
  ) {
    return await tx.inspectionApplication
      .update({
        where: { uuid: applicationUuid, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(
              `InspectionApplication not found: ${applicationUuid}`,
            );
            throw new NotFoundException('Not Found Error');
          }
          this.logger.error(
            `deleteInspectionApplicationInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteInspectionApplicationInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findAvailableInspectorBySlotUuidInTx(
    userEmail: string,
    inspectionSlotUuid: string,
    gender: Gender,
    tx: PrismaTransaction,
  ): Promise<Inspector> {
    const inspectors = await tx.$queryRaw<Inspector[]>`
      SELECT i.*
      FROM inspector AS i
      LEFT JOIN inspector_available_slot AS ias ON ias.inspector_uuid = i.uuid
      WHERE i.email != ${userEmail}
        AND i.gender = ${gender}
        AND ias.inspection_slot_uuid = ${inspectionSlotUuid}
        AND (
          SELECT COUNT(*) 
          FROM inspection_application AS ia
          WHERE ia.inspector_uuid = i.uuid 
            AND ia.inspection_slot_uuid = ${inspectionSlotUuid}
            AND ia.deleted_at IS NULL
        ) < ${this.MAX_APPLICATIONS_PER_INSPECTOR}
      ORDER BY (
        SELECT COUNT(*) 
        FROM inspection_application AS ia 
        WHERE ia.inspector_uuid = i.uuid
            AND ia.deleted_at IS NULL
      ) ASC
      LIMIT 1
      FOR UPDATE
    `.catch((error) => {
      if (error instanceof PrismaClientKnownRequestError) {
        this.logger.error(
          `findAvailableInspectorBySlotUuidInTx prisma error: ${error.message}`,
        );
        throw new InternalServerErrorException('Database Error');
      }
      this.logger.error(`findAvailableInspectorBySlotUuidInTx error: ${error}`);
      throw new InternalServerErrorException('Unknown Error');
    });

    if (inspectors.length === 0) {
      throw new NotFoundException('No available inspector found.');
    }

    return inspectors[0];
  }

  async findApplicationByUserAndSchedule(
    userUuid: string,
    scheduleUuid: string,
  ): Promise<InspectionApplicationWithDetails> {
    return await this.prismaService.inspectionApplication
      .findFirstOrThrow({
        where: {
          userUuid,
          inspectionTargetInfo: {
            scheduleUuid,
          },
          deletedAt: null,
        },
        include: {
          inspectionSlot: true,
          inspectionTargetInfo: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('Application not found');
            throw new NotFoundException('Not Found Error');
          }
          this.logger.error(
            `findApplicationByUserAndSchedule prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findApplicationByUserAndSchedule error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationByUuidInTx(
    uuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionApplicationWithDetails> {
    return await tx.inspectionApplication
      .findFirstOrThrow({
        where: {
          uuid,
          deletedAt: null,
        },
        include: {
          inspectionSlot: true,
          inspectionTargetInfo: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('Application not found');
            throw new NotFoundException('Not Found Error');
          }
          this.logger.error(
            `findApplicationByUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findApplicationByUuidInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationByUuidWithXLockInTx(
    uuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionApplicationWithDetails> {
    await tx.$executeRaw`SELECT 1 FROM "inspection_application" WHERE "uuid" = ${uuid} AND "deleted_at" IS NULL FOR UPDATE`;

    return this.findApplicationByUuidInTx(uuid, tx);
  }

  async findActiveSchedule(): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .findFirstOrThrow({
        where: { status: ScheduleStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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

  async updateInspectionResultInTx(
    applicationUuid: string,
    itemResults: Prisma.InputJsonValue,
    isPassed: boolean,
    inspectorSignatureImage: Uint8Array<ArrayBuffer>,
    targetSignatureImage: Uint8Array<ArrayBuffer>,
    tx: PrismaTransaction,
  ): Promise<InspectionApplication> {
    return await tx.inspectionApplication
      .update({
        where: { uuid: applicationUuid },
        data: {
          itemResults,
          isPassed,
          inspectorSignatureImage,
          targetSignatureImage,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(
              `InspectionApplication not found for update result: ${applicationUuid}`,
            );
            throw new NotFoundException('Inspection application not found.');
          }
          this.logger.error(
            `updateInspectionResultInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateInspectionResultInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
