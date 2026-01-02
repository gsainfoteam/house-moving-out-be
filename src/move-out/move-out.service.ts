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
    const moveOutScheduleDates: MoveOutScheduleDates = {
      applicationStartDate: createMoveOutScheduleDto.applicationStartDate,
      applicationEndDate: createMoveOutScheduleDto.applicationEndDate,
      inspectionStartDate: createMoveOutScheduleDto.inspectionStartDate,
      inspectionEndDate: createMoveOutScheduleDto.inspectionEndDate,
    };

    this.validateScheduleDates(moveOutScheduleDates);

    return await this.moveOutRepository.createMoveOutSchedule(
      createMoveOutScheduleDto,
    );
  }

  async updateMoveOutSchedule(
    id: number,
    updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    const Schedule = await this.moveOutRepository.findMoveOutScheduleById(id);

    const updatedMoveOutScheduleDates: MoveOutScheduleDates = {
      applicationStartDate:
        updateMoveOutScheduleDto.applicationStartDate ??
        Schedule.applicationStartDate,
      applicationEndDate:
        updateMoveOutScheduleDto.applicationEndDate ??
        Schedule.applicationEndDate,
      inspectionStartDate:
        updateMoveOutScheduleDto.inspectionStartDate ??
        Schedule.inspectionStartDate,
      inspectionEndDate:
        updateMoveOutScheduleDto.inspectionEndDate ??
        Schedule.inspectionEndDate,
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

    if (applicationStartDate >= applicationEndDate) {
      throw new BadRequestException(
        'Application start date must be before application end date',
      );
    }

    if (inspectionStartDate >= inspectionEndDate) {
      throw new BadRequestException(
        'Inspection start date must be before inspection end date',
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
