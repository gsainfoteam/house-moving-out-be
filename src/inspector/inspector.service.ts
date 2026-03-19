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
} from '@lib/database';
import { Loggable } from '@lib/logger';
import { Gender, User } from 'generated/prisma/client';
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

  async getInspectors(): Promise<InspectorResDto[]> {
    const inspectors = await this.inspectorRepository.findAllInspectors();
    return inspectors.map((inspector) => new InspectorResDto(inspector));
  }

  async createInspectors({ inspectors }: CreateInspectorsDto): Promise<void> {
    await this.databaseService.$transaction(async (tx: PrismaTransaction) => {
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
    uuid: string,
    { availableSlotUuids }: UpdateInspectorDto,
  ): Promise<void> {
    await this.databaseService.$transaction(async (tx: PrismaTransaction) => {
      if (availableSlotUuids.length > 0) {
        const inspector = await this.inspectorRepository.findInspector(uuid);

        await this.validateInspectorSlotGenderInTx(
          inspector.gender,
          availableSlotUuids,
          tx,
        );
      }

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
}
