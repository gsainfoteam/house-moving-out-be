import { Loggable } from '@lib/logger';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import {
  Gender,
  InspectionApplication,
  Inspector,
  InspectorAvailableSlot,
  Prisma,
} from 'generated/prisma/client';
import { PrismaTransaction } from '../types';
import { InspectorWithSlots } from '../types/inspector.type';

@Loggable()
@Injectable()
export class InspectorRepository {
  private readonly logger = new Logger(InspectorRepository.name);
  private readonly MAX_APPLICATIONS_PER_INSPECTOR = 2;
  constructor(private readonly databaseService: DatabaseService) {}

  async findAllInspectors(scheduleUuid: string): Promise<InspectorWithSlots[]> {
    return await this.databaseService.inspector
      .findMany({
        where: {
          availableSlots: {
            some: {
              inspectionSlot: { scheduleUuid },
            },
          },
        },
        include: {
          availableSlots: {
            where: {
              inspectionSlot: { scheduleUuid },
            },
            include: {
              inspectionSlot: true,
            },
          },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`findAllInspectors prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAllInspectors error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectorsInTx(
    inspector: Prisma.InspectorCreateInput,
    tx: PrismaTransaction,
  ) {
    return await tx.inspector
      .upsert({
        where: { email: inspector.email },
        create: inspector,
        update: inspector,
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            this.logger.debug(`Conflict email: ${error.message}`);
            throw new ConflictException('Conflict Error');
          }
          this.logger.error(`createInspectors prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectors error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspector(
    uuid: string,
    scheduleUuid: string,
  ): Promise<InspectorWithSlots> {
    return await this.databaseService.inspector
      .findUniqueOrThrow({
        where: { uuid },
        include: {
          availableSlots: {
            where: {
              inspectionSlot: { scheduleUuid },
            },
            include: {
              inspectionSlot: true,
            },
          },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Inspector not found: ${uuid}`);
            throw new NotFoundException(`Inspector not found`);
          }
          this.logger.error(`findInspector prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspector error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectorInTx(
    uuid: string,
    tx: PrismaTransaction,
  ): Promise<
    Inspector & {
      applications: InspectionApplication[];
      availableSlots: InspectorAvailableSlot[];
    }
  > {
    return await tx.inspector
      .findUniqueOrThrow({
        where: { uuid },
        include: {
          applications: {
            where: { deletedAt: null },
          },
          availableSlots: true,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Inspector not found: ${uuid}`);
            throw new NotFoundException(`Inspector not found`);
          }
          this.logger.error(`findInspector prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspector error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectorByUserInfo(
    email: string,
    name: string,
    studentNumber: string,
  ): Promise<Inspector> {
    return await this.databaseService.inspector
      .findUniqueOrThrow({
        where: {
          email,
          name,
          studentNumber,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('Inspector not found');
            throw new ForbiddenException('User is not an inspector.');
          }
          this.logger.error(
            `findInspectorByUserInfo prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspectorByUserInfo error: ${error}`);
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

  async findInspectorByScheduleUuid(
    uuid: string,
  ): Promise<InspectorWithSlots[]> {
    return await this.databaseService.inspector
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
            where: {
              inspectionSlot: { scheduleUuid: uuid },
            },
            include: {
              inspectionSlot: true,
            },
          },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findInspectorByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspectorByScheduleUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
