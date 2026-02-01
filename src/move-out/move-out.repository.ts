import {
  ConflictException,
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
} from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateMoveOutScheduleDto } from './dto/req/update-move-out-schedule.dto';
import { InspectionTargetStudent } from './types/inspection-target.type';
import { PrismaTransaction } from 'src/common/types';
import { MoveOutScheduleWithSlots } from './types/move-out-schedule-with-slots.type';
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
        where: { status: 'ACTIVE' },
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
            throw new NotFoundException('Inspection target info not found.');
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
}
