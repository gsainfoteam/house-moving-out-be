import { BadRequestException, Injectable } from '@nestjs/common';
import { MoveOutRepository } from './move-out.repository';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import { MoveOutSchedule } from 'generated/prisma/client';
import { MoveOutScheduleDates } from './types/moveOutScheduleDates.type';
import { UpdateMoveOutScheduleDto } from './dto/req/updateMoveOutSchedule.dto';

@Injectable()
export class MoveOutService {
  constructor(private readonly moveOutRepository: MoveOutRepository) {}

  async createMoveOutSchedule(
    createMoveOutScheduleDto: CreateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    this.validateScheduleDates(createMoveOutScheduleDto);

    return await this.moveOutRepository.createMoveOutSchedule(
      createMoveOutScheduleDto,
    );
  }

  async updateMoveOutSchedule(
    id: number,
    updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    const schedule = await this.moveOutRepository.findMoveOutScheduleById(id);

    const updatedMoveOutScheduleDates: MoveOutScheduleDates = {
      ...schedule,
      ...updateMoveOutScheduleDto,
    };

    this.validateScheduleDates(updatedMoveOutScheduleDates);

    return await this.moveOutRepository.updateMoveOutSchedule(
      id,
      updateMoveOutScheduleDto,
    );
  }

  private validateScheduleDates(moveOutScheduleDates: MoveOutScheduleDates) {
    const {
      applicationStartDate,
      applicationEndDate,
      inspectionStartDate,
      inspectionEndDate,
    } = moveOutScheduleDates;

    if (applicationStartDate > applicationEndDate) {
      throw new BadRequestException(
        'Application start date cannot be after application end date',
      );
    }

    if (inspectionStartDate > inspectionEndDate) {
      throw new BadRequestException(
        'Inspection start date cannot be after inspection end date',
      );
    }

    if (applicationStartDate > inspectionStartDate) {
      throw new BadRequestException(
        'Application start date cannot be after inspection start date',
      );
    }

    if (applicationEndDate > inspectionEndDate) {
      throw new BadRequestException(
        'Application end date cannot be after inspection end date',
      );
    }
  }
}
