import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import { MoveOutSchedule } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateMoveOutScheduleDto } from './dto/req/updateMoveOutSchedule.dto';

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
}
