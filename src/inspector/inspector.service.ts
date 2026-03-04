import { Injectable } from '@nestjs/common';
import { CreateInspectorsDto } from './dto/req/create-inspectors.dto';
import { InspectorResDto } from './dto/res/inspector-res.dto';
import { UpdateInspectorDto } from './dto/req/update-inspector.dto';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';
import { Loggable } from '@lib/logger';
import { User } from 'generated/prisma/client';
import { AssignedTargetsResDto } from './dto/res/assigned-targets-res.dto';
import {
  InspectorRepository,
  InspectorAvailableSlotRepository,
  InspectionApplicationRepository,
  MoveOutScheduleRepository,
} from 'libs/database';

@Loggable()
@Injectable()
export class InspectorService {
  constructor(
    private readonly inspectorRepository: InspectorRepository,
    private readonly prismaService: PrismaService,
    private readonly inspectorAvailableSlotRepository: InspectorAvailableSlotRepository,
    private readonly inspectionApplicationRepository: InspectionApplicationRepository,
    private readonly moveOutScheduleRepository: MoveOutScheduleRepository,
  ) {}

  async getInspectors(): Promise<InspectorResDto[]> {
    const inspectors = await this.inspectorRepository.findAllInspectors();
    return inspectors.map((inspector) => new InspectorResDto(inspector));
  }

  async createInspectors({ inspectors }: CreateInspectorsDto): Promise<void> {
    await this.prismaService.$transaction(async (tx: PrismaTransaction) => {
      for (const { availableSlotUuids, ...inspector } of inspectors) {
        const { uuid } = await this.inspectorRepository.createInspectorsInTx(
          inspector,
          tx,
        );
        await this.inspectorAvailableSlotRepository.connectInspectorAndSlotsInTx(
          uuid,
          availableSlotUuids,
          tx,
        );
      }
    });
  }

  async getInspector(uuid: string): Promise<InspectorResDto> {
    const inspector = await this.inspectorRepository.findInspector(uuid);
    return new InspectorResDto(inspector);
  }

  async updateInspector(
    uuid: string,
    { availableSlotUuids }: UpdateInspectorDto,
  ): Promise<void> {
    await this.prismaService.$transaction(async (tx: PrismaTransaction) => {
      await this.inspectorAvailableSlotRepository.deleteInspectorAvailableSlotsInTx(
        uuid,
        tx,
      );
      await this.inspectorAvailableSlotRepository.connectInspectorAndSlotsInTx(
        uuid,
        availableSlotUuids,
        tx,
      );
    });
  }

  async deleteInspector(uuid: string): Promise<void> {
    await this.inspectorRepository.deleteInspector(uuid);
  }

  async getMyAssignedTargets({
    email,
    name,
    studentNumber,
  }: User): Promise<AssignedTargetsResDto> {
    const inspector = await this.inspectorRepository.findInspectorByUserInfo(
      email,
      name,
      studentNumber,
    );

    const schedule = await this.moveOutScheduleRepository.findActiveSchedule();

    const latestApplications =
      await this.inspectionApplicationRepository.findLatestApplicationsByInspector(
        inspector.uuid,
        schedule.uuid,
      );

    const targets = latestApplications
      .map((latestApplication) => {
        const targetInfo = latestApplication.inspectionTargetInfo;
        const residents = [
          targetInfo.student1Name && targetInfo.student1AdmissionYear
            ? {
                admissionYear: targetInfo.student1AdmissionYear,
                name: targetInfo.student1Name,
              }
            : null,
          targetInfo.student2Name && targetInfo.student2AdmissionYear
            ? {
                admissionYear: targetInfo.student2AdmissionYear,
                name: targetInfo.student2Name,
              }
            : null,
          targetInfo.student3Name && targetInfo.student3AdmissionYear
            ? {
                admissionYear: targetInfo.student3AdmissionYear,
                name: targetInfo.student3Name,
              }
            : null,
        ].filter(
          (v): v is { admissionYear: string; name: string } => v !== null,
        );

        return {
          uuid: latestApplication.uuid,
          roomNumber: targetInfo.roomNumber,
          residents,
          inspectionType: targetInfo.inspectionType,
          inspectionTime: latestApplication.inspectionSlot.startTime,
          isPassed: latestApplication.isPassed ?? null,
          inspectionCount: targetInfo.inspectionCount,
        };
      })
      .sort((a, b) => a.inspectionTime.getTime() - b.inspectionTime.getTime());

    return { targets };
  }
}
