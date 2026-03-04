import { Loggable } from '@lib/logger';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import {
  InspectionSlot,
  MoveOutSchedule,
  Prisma,
  ScheduleStatus,
} from 'generated/prisma/client';
import { PrismaTransaction } from 'src/common/types';
import { MoveOutScheduleWithSlots } from 'src/schedule/types/move-out-schedule-with-slots.type';

@Loggable()
@Injectable()
export class MoveOutScheduleRepository {
  private readonly logger = new Logger(MoveOutScheduleRepository.name);
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

  async findMoveOutScheduleWithSlotsByUuid(uuid: string): Promise<
    MoveOutSchedule & {
      inspectionSlots: any[];
      currentSemester: any;
      nextSemester: any;
    }
  > {
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
            throw new NotFoundException(`Move out schedule not found`);
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${uuid}`);
            throw new NotFoundException(`Move out schedule not found`);
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Active MoveOutSchedule not found`);
            throw new NotFoundException(`Active move out schedule not found`);
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
            throw new NotFoundException('Active move out schedule not found');
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

  async updateMoveOutSchedule(
    uuid: string,
    data: Prisma.MoveOutScheduleUpdateInput,
  ): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .update({
        where: { uuid },
        data,
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${uuid}`);
            throw new NotFoundException(`Move out schedule not found`);
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
}
