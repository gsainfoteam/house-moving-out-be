import { Loggable } from '@lib/logger';
import * as crypto from 'crypto';
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
import {
  Gender,
  InspectionApplication,
  Inspector,
  InspectorAvailableSlot,
  MoveOutScheduleOnInspector,
  Prisma,
} from 'generated/prisma/client';
import { PrismaTransaction } from '../types';
import { InspectorWithSlots } from '../types/inspector.type';
import { InspectorDto } from 'src/inspector/dto/req/create-inspectors.dto';
import { TemporaryInspectorDto } from 'src/inspector/dto/req/create-temporary-inspectors.dto';
import { ENCRYPTION_PURPOSE } from '../constants/encryption.constants';

@Loggable()
@Injectable()
export class InspectorRepository {
  private readonly logger = new Logger(InspectorRepository.name);
  public readonly MAX_APPLICATIONS_PER_INSPECTOR = 1;
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findAllInspectors(scheduleUuid: string): Promise<InspectorWithSlots[]> {
    return await this.databaseService.inspector
      .findMany({
        where: {
          schedules: { some: { scheduleUuid } },
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
          schedules: { where: { scheduleUuid } },
        },
      })
      .then(async (inspectors) => {
        return await Promise.all(
          inspectors.map(async (inspector) => ({
            ...(await this.encryptionService.decryptInspector(inspector)),
            availableSlots: inspector.availableSlots,
            schedules: inspector.schedules,
          })),
        );
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
    inspector: InspectorDto | TemporaryInspectorDto,
    tx: PrismaTransaction,
  ) {
    const studentHash = this.encryptionService.hash(inspector.studentNumber);
    const existingInspector = await tx.inspector.findUnique({
      where: { studentHash },
    });
    const uuid = existingInspector?.uuid ?? crypto.randomUUID();
    const [encryptedName, encryptedEmail, encryptedStudentNumber] =
      await Promise.all([
        this.encryptionService.encrypt(
          inspector.name,
          ENCRYPTION_PURPOSE.INSPECTOR.NAME,
          uuid,
        ),
        this.encryptionService.encrypt(
          inspector.email,
          ENCRYPTION_PURPOSE.INSPECTOR.EMAIL,
          uuid,
        ),
        this.encryptionService.encrypt(
          inspector.studentNumber,
          ENCRYPTION_PURPOSE.INSPECTOR.STUDENT_NUMBER,
          uuid,
        ),
      ]);

    return await (
      existingInspector
        ? tx.inspector.update({
            where: { uuid: existingInspector.uuid },
            data: {
              ...inspector,
              name: encryptedName!,
              email: encryptedEmail!,
              studentNumber: encryptedStudentNumber!,
            },
          })
        : tx.inspector.create({
            data: {
              uuid,
              ...inspector,
              name: encryptedName!,
              email: encryptedEmail!,
              studentNumber: encryptedStudentNumber!,
              studentHash,
            },
          })
    ).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          this.logger.debug(`Conflict studentHash: ${error.message}`);
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
        where: { uuid, schedules: { some: { scheduleUuid } } },
        include: {
          availableSlots: {
            where: {
              inspectionSlot: { scheduleUuid },
            },
            include: {
              inspectionSlot: true,
            },
          },
          schedules: { where: { scheduleUuid } },
        },
      })
      .then(async (inspector) => ({
        ...(await this.encryptionService.decryptInspector(inspector)),
        availableSlots: inspector.availableSlots,
        schedules: inspector.schedules,
      }))
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
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<
    Inspector & {
      applications: InspectionApplication[];
      availableSlots: InspectorAvailableSlot[];
      schedules: MoveOutScheduleOnInspector[];
    }
  > {
    await tx.$executeRaw`SELECT 1 FROM "inspector" WHERE "uuid" = ${uuid} FOR UPDATE`;

    return await tx.inspector
      .findUniqueOrThrow({
        where: { uuid, schedules: { some: { scheduleUuid } } },
        include: {
          applications: {
            where: { deletedAt: null },
          },
          availableSlots: true,
          schedules: {
            where: { scheduleUuid },
          },
        },
      })
      .then(async (inspector) => ({
        ...(await this.encryptionService.decryptInspector(inspector)),
        applications: await Promise.all(
          inspector.applications.map((app) =>
            this.encryptionService.decryptApplication(app),
          ),
        ),
        availableSlots: inspector.availableSlots,
        schedules: inspector.schedules,
      }))
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
    name: string,
    studentNumber: string,
  ): Promise<Inspector> {
    const studentHash = this.encryptionService.hash(studentNumber);

    return await this.databaseService.inspector
      .findFirstOrThrow({
        where: {
          studentHash,
        },
      })
      .then(
        async (inspector) =>
          await this.encryptionService.decryptInspector(inspector),
      )
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
      })
      .then((inspector) => {
        if (inspector.name !== name) {
          throw new NotFoundException('Inspector not found');
        }
        return inspector;
      });
  }

  async existsInspectorInScheduleByUserInfo(
    name: string,
    studentNumber: string,
    scheduleUuid: string,
  ): Promise<boolean> {
    const studentHash = this.encryptionService.hash(studentNumber);

    return await this.databaseService.inspector
      .findFirst({
        where: {
          studentHash,
          schedules: { some: { scheduleUuid } },
        },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `existsInspectorInScheduleByStudentNumber prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `existsInspectorInScheduleByStudentNumber error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      })
      .then(async (inspector) => {
        if (!inspector) return false;
        const decrypted =
          await this.encryptionService.decryptInspector(inspector);
        return decrypted.name === name;
      });
  }

  async findAvailableInspectorBySlotUuidInTx(
    residentStudents: { name: string; studentNumber: string }[],
    inspectionSlotUuid: string,
    scheduleUuid: string,
    gender: Gender,
    tx: PrismaTransaction,
  ): Promise<Inspector> {
    const studentHashesToExclude = residentStudents.map((resident) =>
      this.encryptionService.hash(resident.studentNumber),
    );

    const inspectorExclusionCondition =
      studentHashesToExclude.length > 0
        ? Prisma.sql`AND i.student_hash NOT IN (${Prisma.join(studentHashesToExclude)})`
        : Prisma.empty;

    const inspectors = await tx.$queryRaw<Inspector[]>`
      SELECT i.*
      FROM inspector AS i
      INNER JOIN inspector_available_slot AS ias ON ias.inspector_uuid = i.uuid
      INNER JOIN inspection_slot AS ins
        ON ins.uuid = ias.inspection_slot_uuid AND ins.schedule_uuid = ${scheduleUuid}
      WHERE i.gender = ${gender}
        ${inspectorExclusionCondition}
        AND ins.uuid = ${inspectionSlotUuid}
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
        INNER JOIN inspection_slot AS slot ON slot.uuid = ia.inspection_slot_uuid
        WHERE ia.inspector_uuid = i.uuid
          AND ia.deleted_at IS NULL
          AND slot.schedule_uuid = ${scheduleUuid}
      ) ASC, random()
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

    return await this.encryptionService.decryptInspector(inspectors[0]);
  }
}
