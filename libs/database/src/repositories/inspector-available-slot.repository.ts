import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaTransaction } from '../types';

@Loggable()
@Injectable()
export class InspectorAvailableSlotRepository {
  private readonly logger = new Logger(InspectorAvailableSlotRepository.name);

  async connectInspectorAndSlotsInTx(
    inspectorUuid: string,
    inspectionSlotUuids: string[],
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.inspectorAvailableSlot
      .createMany({
        data: inspectionSlotUuids.map((inspectionSlotUuid) => ({
          inspectorUuid,
          inspectionSlotUuid,
        })),
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2003') {
            this.logger.debug(`Inspection slot not found: ${error.message}`);
            throw new NotFoundException(`Inspection slot not found`);
          }
          this.logger.error(
            `connectInspectorAndSlotsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`connectInspectorAndSlotsInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspectorAvailableSlotsInTx(
    inspectorUuid: string,
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.inspectorAvailableSlot
      .deleteMany({
        where: {
          inspectorUuid,
          inspectionSlot: {
            schedule: {
              uuid: scheduleUuid,
            },
          },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteInspectorAvailableSlotsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteInspectorAvailableSlotsInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
