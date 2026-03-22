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
import { InspectionTargetInfo, Prisma } from 'generated/prisma/client';
import { PrismaTransaction } from '../types';
import { InspectionTargetStudent } from 'src/schedule/types/inspection-target.type';
import { InspectionTargetInfoWithApplication } from '../types/inspection-target-info.type';

@Loggable()
@Injectable()
export class InspectionTargetInfoRepository {
  private readonly logger = new Logger(InspectionTargetInfoRepository.name);
  constructor(private readonly databaseService: DatabaseService) {}

  async countInspectionTargetsByScheduleAndUuids(
    scheduleUuid: string,
    targetUuids: string[],
  ): Promise<number> {
    return await this.databaseService.inspectionTargetInfo
      .count({
        where: {
          scheduleUuid,
          uuid: { in: targetUuids },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `countInspectionTargetsByScheduleAndUuids prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `countInspectionTargetsByScheduleAndUuids error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async countInspectionTargetsByScheduleAndUuidsInTx(
    scheduleUuid: string,
    targetUuids: string[],
    tx: PrismaTransaction,
  ): Promise<number> {
    return await tx.inspectionTargetInfo
      .count({
        where: {
          scheduleUuid,
          uuid: { in: targetUuids },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `countInspectionTargetsByScheduleAndUuidsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `countInspectionTargetsByScheduleAndUuidsInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspectionTargetsByScheduleUuidInTx(
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .deleteMany({
        where: { scheduleUuid },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteInspectionTargetsByScheduleUuidInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `deleteInspectionTargetsByScheduleUuidInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectionTargetsInTx(
    scheduleUuid: string,
    inspectionTargetInfos: InspectionTargetStudent[],
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .createMany({
        data: inspectionTargetInfos.map((target) => ({
          scheduleUuid,
          houseName: target.houseName,
          gender: target.gender,
          roomNumber: target.roomNumber,
          roomCapacity: target.roomCapacity,
          student1Name: target.students[0]?.studentName,
          student1StudentNumber: target.students[0]?.studentNumber,
          student2Name: target.students[1]?.studentName,
          student2StudentNumber: target.students[1]?.studentNumber,
          student3Name: target.students[2]?.studentName,
          student3StudentNumber: target.students[2]?.studentNumber,
          applyCleaningService: target.applyCleaningService ?? false,
          inspectionType: target.inspectionType,
        })),
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException(
              'Duplicate inspection target room exists in the given schedule.',
            );
          }
          this.logger.error(
            `createInspectionTargetsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectionTargetsInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateApplyCleaningServiceByScheduleAndUuids(
    scheduleUuid: string,
    targetUuids: string[],
    applyCleaningService: boolean,
  ): Promise<{ count: number }> {
    return await this.databaseService.inspectionTargetInfo
      .updateMany({
        where: {
          scheduleUuid,
          uuid: { in: targetUuids },
        },
        data: { applyCleaningService },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `updateApplyCleaningServiceByScheduleAndUuids prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `updateApplyCleaningServiceByScheduleAndUuids error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateApplyCleaningServiceByScheduleAndUuidsInTx(
    scheduleUuid: string,
    targetUuids: string[],
    applyCleaningService: boolean,
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .updateMany({
        where: {
          scheduleUuid,
          uuid: { in: targetUuids },
        },
        data: { applyCleaningService },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `updateApplyCleaningServiceByScheduleAndUuidsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `updateApplyCleaningServiceByScheduleAndUuidsInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionTargetInfoByUserInfo(
    studentNumber: string,
    studentName: string,
    scheduleUuid: string,
  ): Promise<InspectionTargetInfo> {
    return await this.databaseService.inspectionTargetInfo
      .findFirstOrThrow({
        where: {
          scheduleUuid,
          OR: [
            {
              student1StudentNumber: studentNumber,
              student1Name: studentName,
            },
            {
              student2StudentNumber: studentNumber,
              student2Name: studentName,
            },
            {
              student3StudentNumber: studentNumber,
              student3Name: studentName,
            },
          ],
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new ForbiddenException('User is not an inspection target.');
          }
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
    studentNumber: string,
    studentName: string,
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    return await tx.inspectionTargetInfo
      .findFirstOrThrow({
        where: {
          scheduleUuid,
          OR: [
            {
              student1StudentNumber: studentNumber,
              student1Name: studentName,
            },
            {
              student2StudentNumber: studentNumber,
              student2Name: studentName,
            },
            {
              student3StudentNumber: studentNumber,
              student3Name: studentName,
            },
          ],
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            throw new ForbiddenException('User is not an inspection target.');
          }
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

  async incrementInspectionCountInTx(
    targetUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    return await tx.inspectionTargetInfo
      .update({
        where: { uuid: targetUuid },
        data: {
          inspectionCount: { increment: 1 },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionTargetInfo not found: ${targetUuid}`);
            throw new NotFoundException('Inspection target info not found.');
          }
          this.logger.error(
            `incrementInspectionCountInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`incrementInspectionCountInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async decrementInspectionCountInTx(
    targetUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    return await tx.inspectionTargetInfo
      .update({
        where: { uuid: targetUuid },
        data: {
          inspectionCount: { increment: -1 },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`InspectionTargetInfo not found: ${targetUuid}`);
            throw new NotFoundException('Inspection target info not found.');
          }
          this.logger.error(
            `decrementInspectionCountInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`decrementInspectionCountInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid(
    scheduleUuid: string,
  ): Promise<InspectionTargetInfoWithApplication[]> {
    return await this.databaseService.inspectionTargetInfo
      .findMany({
        where: {
          scheduleUuid,
        },
        include: {
          inspectionApplication: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 2,
            include: {
              inspectionSlot: true,
            },
          },
        },
        orderBy: [{ houseName: 'asc' }, { roomNumber: 'asc' }],
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
