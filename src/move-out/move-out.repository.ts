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
} from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateMoveOutScheduleDto } from './dto/req/update-move-out-schedule.dto';
import { InspectionTargetStudent } from './types/inspection-target.type';
import { PrismaTransaction } from 'src/common/types';
import { MoveOutScheduleWithSlots } from './types/move-out-schedule-with-slots.type';
import { Loggable } from '@lib/logger';

@Loggable()
@Injectable()
export class MoveOutRepository {
  private readonly logger = new Logger(MoveOutRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

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

  async findMoveOutScheduleWithSlotsById(
    id: number,
  ): Promise<MoveOutScheduleWithSlots> {
    return await this.prismaService.moveOutSchedule
      .findUniqueOrThrow({
        where: { id },
        include: {
          inspectionSlots: true,
          currentSemester: true,
          nextSemester: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${id}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `findMoveOutScheduleWithSlotsById prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findMoveOutScheduleWithSlotsById error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateMoveOutSchedule(
    id: number,
    moveOutSchedule: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .update({
        where: { id },
        data: moveOutSchedule,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${id}`);
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

  async findInspectionTargetInfoByUserInfo(
    admissionYear: string,
    studentName: string,
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<InspectionTargetInfo | null> {
    return await this.prismaService.inspectionTargetInfo
      .findUnique({
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
  ): Promise<InspectionTargetInfo | null> {
    return await tx.inspectionTargetInfo
      .findUnique({
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

  async findInspectionApplicationByTargetInfoInTx(
    inspectionTargetInfoUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionApplication | null> {
    return await tx.inspectionApplication
      .findUnique({
        where: {
          inspectionTargetInfoUuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findInspectionApplicationByTargetInfoInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findInspectionApplicationByTargetInfoInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionSlotByUuidInTx(
    slotUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionSlot | null> {
    return await tx.inspectionSlot
      .findUnique({
        where: { uuid: slotUuid },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
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
          reservedCount: {
            increment: 1,
          },
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
          reservedCount: {
            decrement: 1,
          },
          maleReservedCount: isMale
            ? {
                decrement: 1,
              }
            : undefined,
          femaleReservedCount: !isMale
            ? {
                decrement: 1,
              }
            : undefined,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `decrementSlotReservedCountInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`decrementSlotReservedCountInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectionApplicationInTx(
    userUuid: string,
    inspectionTargetInfoUuid: string,
    inspectionSlotUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionApplication> {
    return await tx.inspectionApplication
      .create({
        data: {
          userUuid,
          inspectionTargetInfoUuid,
          inspectionSlotUuid,
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

  async findMoveOutScheduleBySlotUuidInTx(
    slotUuid: string,
    tx: PrismaTransaction,
  ): Promise<MoveOutSchedule | null> {
    try {
      const slot = await tx.inspectionSlot.findUnique({
        where: { uuid: slotUuid },
        include: {
          schedule: true,
        },
      });
      return slot?.schedule || null;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        this.logger.error(
          `findMoveOutScheduleBySlotUuidInTx prisma error: ${error.message}`,
        );
        throw new InternalServerErrorException('Database Error');
      }
      this.logger.error(`findMoveOutScheduleBySlotUuidInTx error: ${error}`);
      throw new InternalServerErrorException('Unknown Error');
    }
  }
}
