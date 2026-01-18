import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { CreateMoveOutScheduleDto } from './dto/req/create-move-out-schedule.dto';
import {
  InspectionTarget,
  MoveOutSchedule,
  Semester,
  Season,
  Prisma,
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
    scheduleData: Omit<CreateMoveOutScheduleDto, 'inspectionTimeRange'>,
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

  async findMoveOutScheduleById(id: number): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .findUniqueOrThrow({
        where: { id },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${id}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `findMoveOutScheduleById prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findMoveOutScheduleById error: ${error}`);
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

  async findFirstInspectionTargetBySemestersInTx(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
    tx: PrismaTransaction,
  ): Promise<Pick<InspectionTarget, 'uuid'> | null> {
    return await tx.inspectionTarget
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
            `findFirstInspectionTargetBySemestersInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findFirstInspectionTargetBySemestersInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectionTargetsInTx(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
    inspectionTargets: InspectionTargetStudent[],
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTarget
      .createMany({
        data: inspectionTargets.map((target) => ({
          currentSemesterUuid,
          nextSemesterUuid,
          houseName: target.houseName,
          roomNumber: target.roomNumber,
          studentName: target.studentName,
          studentNumber: target.studentNumber,
        })),
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `createInspectionTargetsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectionTargetsInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
