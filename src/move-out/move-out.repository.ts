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

  async createMoveOutSchedule(
    scheduleData: Pick<
      MoveOutSchedule,
      | 'title'
      | 'applicationStartTime'
      | 'applicationEndTime'
      | 'currentSemesterUuid'
      | 'nextSemesterUuid'
    >,
    slotsData: Prisma.InspectionSlotCreateManyScheduleInput[],
  ): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
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
          this.logger.error(
            `createMoveOutSchedule prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createMoveOutSchedule error: ${error}`);
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

  async findInspectionTargetHouseNamesBySemesters(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<Array<Pick<InspectionTargetInfo, 'houseName'>>> {
    return await this.prismaService.inspectionTargetInfo
      .findMany({
        where: {
          currentSemesterUuid,
          nextSemesterUuid,
        },
        select: {
          houseName: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findInspectionTargetHouseNamesBySemesters prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findInspectionTargetHouseNamesBySemesters error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionTargetInfosBySemesters(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<InspectionTargetInfo[]> {
    return await this.prismaService.inspectionTargetInfo
      .findMany({
        where: {
          currentSemesterUuid,
          nextSemesterUuid,
        },
        orderBy: [{ houseName: 'asc' }, { roomNumber: 'asc' }],
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findInspectionTargetInfosBySemesters prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findInspectionTargetInfosBySemesters error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspectionTargetInfosBySemesters(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<{ count: number }> {
    return await this.prismaService.inspectionTargetInfo
      .deleteMany({
        where: {
          currentSemesterUuid,
          nextSemesterUuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteInspectionTargetInfosBySemesters prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `deleteInspectionTargetInfosBySemesters error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findFirstInspectionTargetInfoBySemestersInTx(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
    tx: PrismaTransaction,
  ): Promise<Pick<InspectionTargetInfo, 'uuid'> | null> {
    return await tx.inspectionTargetInfo
      .findFirst({
        where: {
          currentSemesterUuid,
          nextSemesterUuid,
        },
        select: {
          uuid: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findFirstInspectionTargetInfoBySemestersInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findFirstInspectionTargetInfoBySemestersInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectionTargetInfosInTx(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
    inspectionTargetInfos: InspectionTargetStudent[],
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .createMany({
        data: inspectionTargetInfos.map((target) => ({
          currentSemesterUuid,
          nextSemesterUuid,
          ...target,
        })),
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `createInspectionTargetInfosInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectionTargetInfosInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionTargetInfoByUserInfo(
    admissionYear: string,
    studentName: string,
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<InspectionTargetInfo> {
    return await this.prismaService.inspectionTargetInfo
      .findUniqueOrThrow({
        where: {
          inspection_target_with_specific_semester: {
            currentSemesterUuid,
            nextSemesterUuid,
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
    currentSemesterUuid: string,
    nextSemesterUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    return await tx.inspectionTargetInfo
      .findUniqueOrThrow({
        where: {
          inspection_target_with_specific_semester: {
            currentSemesterUuid,
            nextSemesterUuid,
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
          WHEN ${isMale} = TRUE AND uuid = ${currentSlotUuid}::uuid THEN male_reserved_count - 1
          WHEN ${isMale} = TRUE AND uuid = ${updatedSlotUuid}::uuid THEN male_reserved_count + 1
          ELSE male_reserved_count
        END,
        female_reserved_count = CASE
          WHEN ${isMale} = FALSE AND uuid = ${currentSlotUuid}::uuid THEN female_reserved_count - 1
          WHEN ${isMale} = FALSE AND uuid = ${updatedSlotUuid}::uuid THEN female_reserved_count + 1
          ELSE female_reserved_count
        END
      WHERE uuid IN (${currentSlotUuid}::uuid, ${updatedSlotUuid}::uuid);
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

  async updateInspectionApplicationInTx(
    applicationUuid: string,
    newInspectionSlotUuid: string,
    inspectorUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionApplication> {
    return await tx.inspectionApplication
      .update({
        where: { uuid: applicationUuid },
        data: {
          inspectionSlotUuid: newInspectionSlotUuid,
          inspectorUuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(
              `InspectionApplication not found for update: ${applicationUuid}`,
            );
            throw new NotFoundException('Inspection application not found.');
          }
          this.logger.error(
            `updateInspectionApplicationInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateInspectionApplicationInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspectionApplicationInTx(
    applicationUuid: string,
    tx: PrismaTransaction,
  ) {
    return await tx.inspectionApplication
      .delete({
        where: { uuid: applicationUuid },
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
        ) < ${this.MAX_APPLICATIONS_PER_INSPECTOR}
      ORDER BY (
        SELECT COUNT(*) 
        FROM inspection_application AS ia 
        WHERE ia.inspector_uuid = i.uuid
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

  async findMoveOutScheduleBySlotUuidInTx(
    slotUuid: string,
    tx: PrismaTransaction,
  ): Promise<MoveOutSchedule> {
    return await tx.inspectionSlot
      .findUniqueOrThrow({
        where: { uuid: slotUuid },
        include: {
          schedule: true,
        },
      })
      .then((slot) => slot.schedule)
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionSlot not found: ${slotUuid}`);
            throw new NotFoundException('Inspection slot not found.');
          }
          this.logger.error(
            `findMoveOutScheduleBySlotUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findMoveOutScheduleBySlotUuidInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationByUserAndSemesters(
    userUuid: string,
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<InspectionApplicationWithDetails> {
    return await this.prismaService.inspectionApplication
      .findFirstOrThrow({
        where: {
          userUuid,
          inspectionTargetInfo: {
            currentSemesterUuid,
            nextSemesterUuid,
          },
        },
        include: {
          inspectionSlot: true,
          inspectionTargetInfo: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('Application not found');
            throw new NotFoundException('Not Found Error');
          }
          this.logger.error(
            `findApplicationByUserAndSemesters prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findApplicationByUserAndSemesters error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationByUuidInTx(
    uuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionApplicationWithDetails> {
    return await tx.inspectionApplication
      .findUniqueOrThrow({
        where: {
          uuid,
        },
        include: {
          inspectionSlot: true,
          inspectionTargetInfo: true,
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
    await tx.$executeRaw`SELECT 1 FROM "inspection_application" WHERE "uuid" = ${uuid}::uuid FOR UPDATE`;

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
}
