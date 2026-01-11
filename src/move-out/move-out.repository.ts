import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import {
  InspectionTarget,
  MoveOutSchedule,
  Semester,
  Season,
} from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateMoveOutScheduleDto } from './dto/req/updateMoveOutSchedule.dto';
import { InspectionTargetStudent } from './types/excel.type';
import { Loggable } from '@lib/logger';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class MoveOutRepository {
  private readonly logger = new Logger(MoveOutRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async createMoveOutSchedule(
    moveOutSchedule: CreateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .create({
        data: moveOutSchedule,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `createMoveOutSchedule prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createMoveOutSchedule error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findMoveOutScheduleById(id: number): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .findUniqueOrThrow({
        where: { id },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${id}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `findMoveOutScheduleById prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findMoveOutScheduleById error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateMoveOutSchedule(
    id: number,
    moveOutSchedule: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    return await this.prismaService.moveOutSchedule
      .update({
        where: { id },
        data: moveOutSchedule,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`MoveOutSchedule not found: ${id}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(
            `updateMoveOutSchedule prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateMoveOutSchedule error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findSemester(year: number, season: Season): Promise<Semester | null> {
    return await this.prismaService.semester
      .findUnique({
        where: {
          year_season: {
            year,
            season,
          },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(`findSemester prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findSemester error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createSemester(year: number, season: Season): Promise<Semester> {
    return await this.prismaService.semester
      .create({
        data: {
          year,
          season,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ConflictException(
              `Semester with year ${year} and season ${season} already exists`,
            );
          }
          this.logger.error(`createSemester prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createSemester error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findFirstInspectionTargetBySemestersInTx(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
    tx: PrismaTransaction,
  ): Promise<Pick<InspectionTarget, 'uuid'> | null> {
    return await tx.inspectionTarget
      .findFirst({
        where: {
          currentSemesterUuid,
          nextSemesterUuid,
        },
        select: {
          uuid: true,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `findFirstInspectionTargetBySemestersInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(
          `findFirstInspectionTargetBySemestersInTx error: ${error}`,
        );
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectionTargetsInTx(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
    inspectionTargets: InspectionTargetStudent[],
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.inspectionTarget
      .createMany({
        data: inspectionTargets.map((target) => ({
          currentSemesterUuid,
          nextSemesterUuid,
          houseName: target.houseName,
          roomNumber: target.roomNumber,
          studentName: target.studentName,
          studentNumber: target.studentNumber,
        })),
        skipDuplicates: true,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `createInspectionTargetsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectionTargetsInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
