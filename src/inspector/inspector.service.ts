import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateInspectorsDto } from './dto/req/create-inspectors.dto';
import { InspectorResDto } from './dto/res/inspector-res.dto';
import { UpdateInspectorDto } from './dto/req/update-inspector.dto';
import {
  DatabaseService,
  InspectorRepository,
  InspectorAvailableSlotRepository,
  InspectionApplicationRepository,
  InspectionSlotRepository,
  MoveOutScheduleRepository,
  PrismaTransaction,
  InspectorWithSlots,
} from '@lib/database';
import { Loggable } from '@lib/logger';
import { Gender, ScheduleStatus, User } from 'generated/prisma/client';
import { AssignedTargetsResDto } from './dto/res/assigned-targets-res.dto';

@Loggable()
@Injectable()
export class InspectorService {
  constructor(
    private readonly inspectorRepository: InspectorRepository,
    private readonly databaseService: DatabaseService,
    private readonly inspectorAvailableSlotRepository: InspectorAvailableSlotRepository,
    private readonly inspectionApplicationRepository: InspectionApplicationRepository,
    private readonly inspectionSlotRepository: InspectionSlotRepository,
    private readonly moveOutScheduleRepository: MoveOutScheduleRepository,
  ) {}

  async getInspectors(scheduleUuid: string): Promise<InspectorResDto[]> {
    const inspectors =
      await this.inspectorRepository.findAllInspectors(scheduleUuid);
    return inspectors.map((inspector) => new InspectorResDto(inspector));
  }

  async createInspectors(
    scheduleUuid: string,
    { inspectors }: CreateInspectorsDto,
  ): Promise<void> {
    await this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      const allSlotUuids = inspectors.flatMap((i) => i.availableSlotUuids);
      await this.validateScheduleStatusBySlotInTx(
        allSlotUuids,
        scheduleUuid,
        tx,
      );

      for (const { availableSlotUuids, ...inspector } of inspectors) {
        const { uuid } = await this.inspectorRepository.createInspectorsInTx(
          inspector,
          tx,
        );

        if (availableSlotUuids.length > 0) {
          await this.validateInspectorSlotGenderInTx(
            inspector.gender,
            availableSlotUuids,
            tx,
          );
        }

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
    scheduleUuid: string,
    uuid: string,
    { availableSlotUuids }: UpdateInspectorDto,
  ): Promise<void> {
    const inspector = await this.inspectorRepository.findInspector(uuid);
    await this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      await this.validateScheduleStatusBySlotInTx(
        availableSlotUuids,
        scheduleUuid,
        tx,
      );
      await this.validateScheduleStatusByInspectorInTx(
        inspector,
        scheduleUuid,
        tx,
      );

      if (availableSlotUuids.length > 0) {
        await this.validateInspectorSlotGenderInTx(
          inspector.gender,
          availableSlotUuids,
          tx,
        );
      }

      await this.inspectorAvailableSlotRepository.deleteInspectorAvailableSlotsInTx(
        uuid,
        scheduleUuid,
        tx,
      );

      await this.inspectorAvailableSlotRepository.connectInspectorAndSlotsInTx(
        uuid,
        availableSlotUuids,
        tx,
      );
    });
  }

  async deleteInspector(scheduleUuid: string, uuid: string): Promise<void> {
    const inspector = await this.inspectorRepository.findInspector(uuid);

    await this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      await this.validateScheduleStatusByInspectorInTx(
        inspector,
        scheduleUuid,
        tx,
      );

      await this.inspectorAvailableSlotRepository.deleteInspectorAvailableSlotsInTx(
        uuid,
        scheduleUuid,
        tx,
      );
    });
  }

  async getMyAssignedTargets({
    email,
    name,
    studentNumber,
  }: User): Promise<AssignedTargetsResDto[]> {
    const inspector = await this.inspectorRepository.findInspectorByUserInfo(
      email,
      name,
      studentNumber,
    );

    const schedule = await this.moveOutScheduleRepository.findActiveSchedule();

    const applications =
      await this.inspectionApplicationRepository.findApplicationsByInspector(
        inspector.uuid,
        schedule.uuid,
      );

    return applications.map((application) => {
      return new AssignedTargetsResDto(application);
    });
  }

  async checkInspectorByUserInfo(user: User): Promise<boolean> {
    try {
      const inspector = await this.inspectorRepository.findInspectorByUserInfo(
        user.email,
        user.name,
        user.studentNumber,
      );
      return !!inspector;
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  private async validateInspectorSlotGenderInTx(
    inspectorGender: Gender,
    slotUuids: string[],
    tx: PrismaTransaction,
  ): Promise<void> {
    const slots =
      await this.inspectionSlotRepository.findSlotsByUuidsWithGenderInTx(
        slotUuids,
        tx,
      );

    if (slots.length !== slotUuids.length) {
      throw new NotFoundException('Inspection slot not found');
    }

    const invalidSlot = slots.find((slot) => slot.gender !== inspectorGender);

    if (invalidSlot) {
      throw new ForbiddenException(
        'Inspector gender must match inspection slot gender.',
      );
    }
  }

  private async validateScheduleStatusBySlotInTx(
    slotUuids: string[],
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    const schedule =
      await this.moveOutScheduleRepository.findMoveOutScheduleByUuidWithXLockInTx(
        scheduleUuid,
        tx,
      );

    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new ForbiddenException(
        `Inspectors can only be managed when the schedule status is DRAFT.`,
      );
    }

    if (slotUuids.length === 0) return;

    const slots = await this.inspectionSlotRepository.findSlotsInTx(
      slotUuids,
      tx,
    );

    const invalidSlot = slots.find(
      (slot) => slot.scheduleUuid !== scheduleUuid,
    );

    if (invalidSlot) {
      throw new ForbiddenException(
        `Inspectors can only be managed when the schedule status is DRAFT.`,
      );
    }
  }

  private async validateScheduleStatusByInspectorInTx(
    inspector: InspectorWithSlots,
    scheduleUuid: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    const schedule =
      await this.moveOutScheduleRepository.findMoveOutScheduleByUuidWithXLockInTx(
        scheduleUuid,
        tx,
      );

    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new ForbiddenException(
        `Inspectors can only be managed when the schedule status is DRAFT.`,
      );
    }

    const slotUuids = inspector.availableSlots.map(
      (slot) => slot.inspectionSlot.uuid,
    );
    const slots = await this.inspectionSlotRepository.findSlotsInTx(
      slotUuids,
      tx,
    );
    const validSlot = slots.find((slot) => slot.scheduleUuid === scheduleUuid);

    if (!validSlot) {
      throw new ForbiddenException(
        `Inspectors can only be managed when the schedule status is DRAFT.`,
      );
    }
  }
}
