import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { Prisma } from 'generated/prisma/client';
import { PrismaTransaction } from '../types';

@Loggable()
@Injectable()
export class MoveOutScheduleOnInspectorRepository {
  private readonly logger = new Logger(
    MoveOutScheduleOnInspectorRepository.name,
  );
  public readonly MAX_APPLICATIONS_PER_INSPECTOR = 2;
  constructor(private readonly databaseService: DatabaseService) {}

  async connectScheduleAndInspectorInTx(
    scheduleUuid: string,
    inspectorUuid: string,
    isTemporary: boolean,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.moveOutScheduleOnInspector
      .upsert({
        where: {
          scheduleUuid_inspectorUuid: {
            scheduleUuid,
            inspectorUuid,
          },
        },
        create: {
          scheduleUuid,
          inspectorUuid,
          isTemporary,
        },
        update: {},
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `connectScheduleAndInspector prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`connectScheduleAndInspector error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateInspectorToTemporaryInTx(
    scheduleUuid: string,
    inspectorUuid: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.moveOutScheduleOnInspector
      .update({
        where: {
          scheduleUuid_inspectorUuid: {
            scheduleUuid,
            inspectorUuid,
          },
        },
        data: { isTemporary: true },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Inspector not found: ${inspectorUuid}`);
            throw new NotFoundException(`Inspector not found`);
          }
          this.logger.error(
            `updateInspectorToTemporary prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateInspectorToTemporary error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
