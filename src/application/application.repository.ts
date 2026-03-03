import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import {
  Prisma,
  Gender,
  InspectionApplication,
  Inspector,
} from 'generated/prisma/client';
import { PrismaTransaction } from 'src/common/types';
import { InspectionApplicationWithDetails } from '../inspector/types/inspection-application-with-details.type';
import { Loggable } from '@lib/logger';
import { ApplicationInfo } from './types/application-info.type';

@Loggable()
@Injectable()
export class ApplicationRepository {
  private readonly logger = new Logger(ApplicationRepository.name);
  private readonly MAX_APPLICATIONS_PER_INSPECTOR = 2;
  constructor(private readonly prismaService: PrismaService) {}

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

  async findApplicationByUserAndSchedule(
    userUuid: string,
    scheduleUuid: string,
  ): Promise<InspectionApplicationWithDetails> {
    return await this.prismaService.inspectionApplication
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
  ): Promise<InspectionApplicationWithDetails> {
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
  ): Promise<InspectionApplicationWithDetails> {
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
    return await this.prismaService.inspectionApplication
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
    return await this.prismaService.inspectionApplication
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
}
