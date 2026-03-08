import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import {
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
}
