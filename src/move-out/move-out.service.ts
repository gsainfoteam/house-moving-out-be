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
    const { title, ...moveOutScheduleDates } = createMoveOutScheduleDto;

    this.validateScheduleDates(moveOutScheduleDates);

    return await this.moveOutRepository.createMoveOutSchedule(
      createMoveOutScheduleDto,
    );
  }

  async updateMoveOutSchedule(
    id: number,
    updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    const schedule = await this.moveOutRepository.findMoveOutScheduleById(id);
    const {
      id: _id,
      title: _title,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...baseScheduleDates
    } = schedule;

    const updatedMoveOutScheduleDates: MoveOutScheduleDates = {
      ...baseScheduleDates,
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
