import { Loggable } from '@lib/logger';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import {
  Gender,
  InspectionSlot,
  MoveOutSchedule,
  Prisma,
} from 'generated/prisma/client';
import { PrismaTransaction } from '../types';

@Loggable()
@Injectable()
export class InspectionSlotRepository {
  private readonly logger = new Logger(InspectionSlotRepository.name);
  constructor(private readonly databaseService: DatabaseService) {}

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

  async findInspectionSlotWithScheduleByUuid(slotUuid: string): Promise<any> {
    return await this.databaseService.inspectionSlot
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
            `findInspectionSlotWithScheduleByUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findInspectionSlotWithScheduleByUuid error: ${error}`,
        );
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
    tx: PrismaTransaction,
  ): Promise<InspectionSlot> {
    return await tx.inspectionSlot
      .update({
        where: { uuid: slotUuid },
        data: {
          reservedCount: { increment: 1 },
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
    tx: PrismaTransaction,
  ): Promise<InspectionSlot> {
    return await tx.inspectionSlot
      .update({
        where: { uuid: slotUuid },
        data: {
          reservedCount: { increment: -1 },
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
    tx: PrismaTransaction,
  ): Promise<void> {
    try {
      await tx.$queryRaw<
        Array<{ uuid: string }>
      >`SELECT uuid FROM inspection_slot WHERE uuid = ${currentSlotUuid} OR uuid = ${updatedSlotUuid} ORDER BY uuid FOR UPDATE`;

      const { count: decCount } = await tx.inspectionSlot.updateMany({
        where: {
          uuid: currentSlotUuid,
          reservedCount: { gt: 0 },
        },
        data: { reservedCount: { decrement: 1 } },
      });

      const { count: incCount } = await tx.inspectionSlot.updateMany({
        where: { uuid: updatedSlotUuid },
        data: { reservedCount: { increment: 1 } },
      });

      if (incCount !== 1) {
        this.logger.debug(
          `InspectionSlot not found: updatedSlotUuid=${updatedSlotUuid}`,
        );
        throw new NotFoundException(
          `Inspection slot not found. slotUuid=${updatedSlotUuid}`,
        );
      }

      if (decCount !== 1) {
        this.logger.debug(
          `InspectionSlot reserved count underflow or slot missing: currentSlotUuid=${currentSlotUuid}`,
        );
        throw new ConflictException(
          `Cannot decrement reserved count. slotUuid=${currentSlotUuid}`,
        );
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          `swapSlotReservedCountsInTx prisma error: ${error.message}`,
        );
        throw new InternalServerErrorException('Database Error');
      }
      this.logger.error(`swapSlotReservedCountsInTx error: ${error}`);
      throw new InternalServerErrorException('Unknown Error');
    }
  }

  async updateSlotCapacitiesByScheduleUuidInTx(
    scheduleUuid: string,
    maleCapacity: number,
    femaleCapacity: number,
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    try {
      const [maleResult, femaleResult] = await Promise.all([
        tx.inspectionSlot.updateMany({
          where: { scheduleUuid, gender: Gender.MALE },
          data: { capacity: maleCapacity },
        }),
        tx.inspectionSlot.updateMany({
          where: { scheduleUuid, gender: Gender.FEMALE },
          data: { capacity: femaleCapacity },
        }),
      ]);

      return { count: maleResult.count + femaleResult.count };
    } catch (error) {
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
    }
  }

  async findSlotsByUuidsWithGenderInTx(
    slotUuids: string[],
    tx: PrismaTransaction,
  ): Promise<Array<Pick<InspectionSlot, 'uuid' | 'gender'>>> {
    return await tx.inspectionSlot
      .findMany({
        where: { uuid: { in: slotUuids } },
        select: { uuid: true, gender: true },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findSlotsByUuidsWithGenderInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findSlotsByUuidsWithGenderInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findSlotsWithInspectorCountByScheduleUuidInTx(
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<Array<InspectionSlot & { _count: { inspectors: number } }>> {
    return await tx.inspectionSlot
      .findMany({
        where: { scheduleUuid },
        include: {
          _count: {
            select: { inspectors: true },
          },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findSlotsWithInspectorCountByScheduleUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findSlotsWithInspectorCountByScheduleUuidInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findSlotsWithScheduleInTx(
    slotUuids: string[],
    tx: PrismaTransaction,
  ): Promise<InspectionSlot[]> {
    return await tx.inspectionSlot
      .findMany({
        where: { uuid: { in: slotUuids } },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findScheduleBySlotUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findScheduleBySlotUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
