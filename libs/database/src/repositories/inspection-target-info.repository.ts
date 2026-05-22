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
import { EncryptionService } from '../encryption.service';
import { InspectionTargetInfo, Prisma } from 'generated/prisma/client';
import { PrismaTransaction } from '../types';
import { InspectionTargetStudent } from 'src/schedule/types/inspection-target.type';
import { InspectionTargetInfoWithApplication } from '../types/inspection-target-info.type';
import { ENCRYPTION_PURPOSE } from '../constants/encryption.constants';

@Loggable()
@Injectable()
export class InspectionTargetInfoRepository {
  private readonly logger = new Logger(InspectionTargetInfoRepository.name);
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly encryptionService: EncryptionService,
  ) {}

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
        data: await Promise.all(
          inspectionTargetInfos.map(async (target) => {
            const uuid = crypto.randomUUID();
            const studentHashes = target.students.map((s) =>
              this.encryptionService.hash(s.studentName, s.studentNumber),
            );

            const [
              student1Name,
              student1StudentNumber,
              student2Name,
              student2StudentNumber,
              student3Name,
              student3StudentNumber,
            ] = await Promise.all([
              this.encryptionService.encrypt(
                target.students[0]?.studentName,
                ENCRYPTION_PURPOSE.TARGET.STUDENT1_NAME,
                uuid,
              ),
              this.encryptionService.encrypt(
                target.students[0]?.studentNumber,
                ENCRYPTION_PURPOSE.TARGET.STUDENT1_STUDENT_NUMBER,
                uuid,
              ),
              this.encryptionService.encrypt(
                target.students[1]?.studentName,
                ENCRYPTION_PURPOSE.TARGET.STUDENT2_NAME,
                uuid,
              ),
              this.encryptionService.encrypt(
                target.students[1]?.studentNumber,
                ENCRYPTION_PURPOSE.TARGET.STUDENT2_STUDENT_NUMBER,
                uuid,
              ),
              this.encryptionService.encrypt(
                target.students[2]?.studentName,
                ENCRYPTION_PURPOSE.TARGET.STUDENT3_NAME,
                uuid,
              ),
              this.encryptionService.encrypt(
                target.students[2]?.studentNumber,
                ENCRYPTION_PURPOSE.TARGET.STUDENT3_STUDENT_NUMBER,
                uuid,
              ),
            ]);

            return {
              uuid,
              scheduleUuid,
              houseName: target.houseName,
              gender: target.gender,
              roomNumber: target.roomNumber,
              roomCapacity: target.roomCapacity,
              student1Name,
              student1StudentNumber,
              student2Name,
              student2StudentNumber,
              student3Name,
              student3StudentNumber,
              studentHashes,
              applyCleaningService: target.applyCleaningService ?? false,
              applyRepairCheck: target.applyRepairCheck ?? false,
              inspectionType: target.inspectionType,
            };
          }),
        ),
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

  async updateApplyRepairCheckByScheduleAndUuidsInTx(
    scheduleUuid: string,
    targetUuids: string[],
    applyRepairCheck: boolean,
    tx: PrismaTransaction,
  ): Promise<{ count: number }> {
    return await tx.inspectionTargetInfo
      .updateMany({
        where: {
          scheduleUuid,
          uuid: { in: targetUuids },
        },
        data: { applyRepairCheck },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `updateApplyRepairCheckByScheduleAndUuidsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `updateApplyRepairCheckByScheduleAndUuidsInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspectionTargetInfoByUserInfo(
    studentNumber: string,
    studentName: string,
    scheduleUuid: string,
  ): Promise<InspectionTargetInfo> {
    const studentHash = this.encryptionService.hash(studentName, studentNumber);

    const target = await this.databaseService.inspectionTargetInfo
      .findFirstOrThrow({
        where: {
          scheduleUuid,
          studentHashes: { has: studentHash },
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

    return await this.encryptionService.decryptTarget(target);
  }

  async findInspectionTargetInfoByUserInfoInTx(
    studentNumber: string,
    studentName: string,
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<InspectionTargetInfo> {
    const studentHash = this.encryptionService.hash(studentName, studentNumber);

    const target = await tx.inspectionTargetInfo
      .findFirstOrThrow({
        where: {
          scheduleUuid,
          studentHashes: { has: studentHash },
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

    return await this.encryptionService.decryptTarget(target);
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
      .then(
        async (target) => await this.encryptionService.decryptTarget(target),
      )

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
  ): Promise<void> {
    await tx.inspectionTargetInfo
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
      .then(async (targets) => {
        return await Promise.all(
          targets.map(async (target) => ({
            ...(await this.encryptionService.decryptTarget(target)),
            inspectionApplication: target.inspectionApplication,
          })),
        );
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
