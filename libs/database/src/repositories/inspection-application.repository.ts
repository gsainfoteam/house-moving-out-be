import { Loggable } from '@lib/logger';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { InspectionApplication, Prisma } from 'generated/prisma/client';
import { PrismaTransaction } from 'src/common/types';
import {
  ApplicationInfo,
  ApplicationWithDetails,
} from '../types/inspection-application.type';

@Loggable()
@Injectable()
export class InspectionApplicationRepository {
  private readonly logger = new Logger(InspectionApplicationRepository.name);
  constructor(private readonly databaseService: DatabaseService) {}

  async createInspectionApplicationInTx(
    userUuid: string,
    inspectionTargetInfoUuid: string,
    inspectionSlotUuid: string,
    inspectorUuid: string,
    inspectionCount: number,
    tx: PrismaTransaction,
  ): Promise<InspectionApplication> {
    return await tx.inspectionApplication
      .create({
        data: {
          userUuid,
          inspectionTargetInfoUuid,
          inspectionSlotUuid,
          inspectorUuid,
          inspectionCount,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

  async deleteInspectionApplicationInTx(
    applicationUuid: string,
    tx: PrismaTransaction,
  ) {
    return await tx.inspectionApplication
      .update({
        where: { uuid: applicationUuid, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

  async findApplicationByUserAndSchedule(
    userUuid: string,
    scheduleUuid: string,
  ): Promise<ApplicationWithDetails> {
    return await this.databaseService.inspectionApplication
      .findFirstOrThrow({
        where: {
          userUuid,
          inspectionTargetInfo: {
            scheduleUuid,
          },
          deletedAt: null,
        },
        include: {
          inspectionSlot: true,
          inspectionTargetInfo: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug('Application not found');
            throw new NotFoundException('Not Found Error');
          }
          this.logger.error(
            `findApplicationByUserAndSchedule prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findApplicationByUserAndSchedule error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationByUuidInTx(
    uuid: string,
    tx: PrismaTransaction,
  ): Promise<ApplicationWithDetails> {
    return await tx.inspectionApplication
      .findUniqueOrThrow({
        where: {
          uuid,
          deletedAt: null,
        },
        include: {
          inspectionSlot: true,
          inspectionTargetInfo: true,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
  ): Promise<ApplicationWithDetails> {
    await tx.$executeRaw`SELECT 1 FROM "inspection_application" WHERE "uuid" = ${uuid} AND "is_passed" IS NULL AND "deleted_at" IS NULL FOR UPDATE`;

    return this.findApplicationByUuidInTx(uuid, tx);
  }

  async updateInspectionResultInTx(
    applicationUuid: string,
    itemResults: Prisma.InputJsonValue,
    isPassed: boolean,
    document: string,
    isDocumentActive: boolean,
    tx: PrismaTransaction,
  ): Promise<InspectionApplication> {
    return await tx.inspectionApplication
      .update({
        where: { uuid: applicationUuid },
        data: {
          itemResults,
          isPassed,
          document,
          isDocumentActive,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(
              `InspectionApplication not found for update result: ${applicationUuid}`,
            );
            throw new NotFoundException('Inspection application not found.');
          }
          this.logger.error(
            `updateInspectionResultInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateInspectionResultInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateDocumentActiveStatus(
    applicationUuid: string,
    isDocumentActive: boolean,
  ): Promise<InspectionApplication> {
    return await this.databaseService.inspectionApplication
      .update({
        where: { uuid: applicationUuid },
        data: { isDocumentActive },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(
              `InspectionApplication not found for update status: ${applicationUuid}`,
            );
            throw new NotFoundException('Inspection application not found.');
          }
          this.logger.error(
            `updateDocumentActiveStatus prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateDocumentActiveStatus error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationByUuid(uuid: string): Promise<ApplicationInfo> {
    return await this.databaseService.inspectionApplication
      .findUniqueOrThrow({
        where: {
          uuid,
          deletedAt: null,
        },
        include: {
          user: true,
          inspectionSlot: true,
          inspector: true,
          inspectionTargetInfo: true,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionApplication not found: ${uuid}`);
            throw new NotFoundException('Inspection application not found.');
          }
          this.logger.error(
            `findApplicationByUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findApplicationByUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findApplicationsByScheduleUuid(
    offset: number,
    limit: number,
    scheduleUuid: string,
  ): Promise<ApplicationInfo[]> {
    return await this.databaseService.inspectionApplication
      .findMany({
        where: {
          inspectionSlot: {
            scheduleUuid,
          },
          deletedAt: null,
        },
        include: {
          user: true,
          inspectionSlot: true,
          inspector: true,
          inspectionTargetInfo: true,
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findApplicationsByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findApplicationsByScheduleUuid error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async countApplications(scheduleUuid: string): Promise<number> {
    return await this.databaseService.inspectionApplication
      .count({
        where: {
          inspectionSlot: {
            scheduleUuid,
          },
          deletedAt: null,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`countApplications prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`countApplications error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findLatestApplicationsByInspector(
    inspectorUuid: string,
    scheduleUuid: string,
  ): Promise<ApplicationWithDetails[]> {
    return await this.databaseService.inspectionApplication
      .findMany({
        where: {
          deletedAt: null,
          inspectorUuid,
          inspectionTargetInfo: { scheduleUuid },
        },
        orderBy: [{ inspectionTargetInfoUuid: 'asc' }, { createdAt: 'desc' }],
        distinct: ['inspectionTargetInfoUuid'],
        include: {
          inspectionSlot: true,
          inspectionTargetInfo: true,
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findLatestApplicationsByInspector prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findLatestApplicationsByInspector error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
