import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException, // Add NotFoundException import
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import { MoveOutSchedule } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { UpdateMoveOutScheduleDto } from './dto/req/updateSchedule.dto';

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
          this.logger.error('createMoveOutSchedule error');
          this.logger.debug(error);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error('createMoveOutSchedule error');
        this.logger.debug(error);
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
            throw new NotFoundException(
              `MoveOutSchedule with ID ${id} not found`,
            );
          }
          this.logger.error('findMoveOutScheduleById error');
          this.logger.debug(error);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error('findMoveOutScheduleById Unknown Error');
        this.logger.debug(error);
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
            this.logger.debug(`MoveOutSchedule with id ${id} not found`);
            throw new NotFoundException(
              `MoveOutSchedule with id ${id} not found`,
            );
          }
          this.logger.error('updateMoveOutSchedule error');
          this.logger.debug(error);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error('updateMoveOutSchedule Unknown Error');
        this.logger.debug(error);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
