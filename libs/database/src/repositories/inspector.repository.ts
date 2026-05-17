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

@Loggable()
@Injectable()
export class InspectorRepository {
  private readonly logger = new Logger(InspectorRepository.name);
  public readonly MAX_APPLICATIONS_PER_INSPECTOR = 2;
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
      .then((inspectors) =>
        inspectors.map((inspector) => ({
          ...this.encryptionService.decryptInspector(inspector),
          availableSlots: inspector.availableSlots,
          schedules: inspector.schedules,
        })),
      )
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
    const encryptedName = this.encryptionService.encrypt(inspector.name)!;
    const nameHash = this.encryptionService.hash(inspector.name);
    const encryptedEmail = this.encryptionService.encrypt(inspector.email)!;
    const emailHash = this.encryptionService.hash(inspector.email);
    const encryptedStudentNumber = this.encryptionService.encrypt(
      inspector.studentNumber,
    )!;
    const studentNumberHash = this.encryptionService.hash(
      inspector.studentNumber,
    );

    return await tx.inspector
      .upsert({
        where: { emailHash },
        create: {
          ...inspector,
          name: encryptedName,
          nameHash,
          email: encryptedEmail,
          emailHash,
          studentNumber: encryptedStudentNumber,
          studentNumberHash,
        },
        update: {
          ...inspector,
          name: encryptedName,
          nameHash,
          email: encryptedEmail,
          emailHash,
          studentNumber: encryptedStudentNumber,
          studentNumberHash,
        },
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
      .then((inspector) => ({
        ...this.encryptionService.decryptInspector(inspector),
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
      .then((inspector) => ({
        ...this.encryptionService.decryptInspector(inspector),
        applications: inspector.applications,
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
    email: string,
    name: string,
    studentNumber: string,
  ): Promise<Inspector> {
    const emailHash = this.encryptionService.hash(email);
    const nameHash = this.encryptionService.hash(name);
    const studentNumberHash = this.encryptionService.hash(studentNumber);

    return await this.databaseService.inspector
      .findFirstOrThrow({
        where: {
          emailHash,
          nameHash,
          studentNumberHash,
        },
      })
      .then((inspector) => this.encryptionService.decryptInspector(inspector))
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

  async existsInspectorInScheduleByUserInfo(
    email: string,
    name: string,
    studentNumber: string,
    scheduleUuid: string,
  ): Promise<boolean> {
    const emailHash = this.encryptionService.hash(email);
    const nameHash = this.encryptionService.hash(name);
    const studentNumberHash = this.encryptionService.hash(studentNumber);

    return await this.databaseService.inspector
      .findFirst({
        where: {
          emailHash,
          nameHash,
          studentNumberHash,
          availableSlots: {
            some: {
              inspectionSlot: { scheduleUuid },
            },
          },
        },
      })
      .then((inspector) => !!inspector)
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `existsInspectorInScheduleByUserInfo prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `existsInspectorInScheduleByUserInfo error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findAvailableInspectorBySlotUuidInTx(
    studentNumbersToExclude: string[],
    inspectionSlotUuid: string,
    scheduleUuid: string,
    gender: Gender,
    tx: PrismaTransaction,
  ): Promise<Inspector> {
    const studentNumberHashesToExclude = studentNumbersToExclude.map(
      (studentNumber) => this.encryptionService.hash(studentNumber),
    );

    const inspectorExclusionCondition =
      studentNumberHashesToExclude.length > 0
        ? Prisma.sql`AND i.student_number_hash NOT IN (${Prisma.join(studentNumberHashesToExclude)})`
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

    return this.encryptionService.decryptInspector(inspectors[0]);
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
          schedules: { where: { scheduleUuid: uuid } },
        },
      })
      .then((inspectors) =>
        inspectors.map((i) => ({
          ...this.encryptionService.decryptInspector(i),
          availableSlots: i.availableSlots,
          schedules: i.schedules,
        })),
      )
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
