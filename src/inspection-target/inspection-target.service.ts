import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InspectionTargetRepository } from './inspection-target.repository';
import {
  Gender,
  RoomInspectionType,
  ScheduleStatus,
} from 'generated/prisma/client';
import { Loggable } from '@lib/logger';
import * as ExcelJS from 'exceljs';
import {
  RoomInfo,
  ExcelParserService,
  ExcelValidatorService,
} from '@lib/excel-parser';
import { InspectionTargetStudent } from './types/inspection-target.type';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';
import { User } from 'generated/prisma/client';
import { InspectionTargetsGroupedByRoomResDto } from './dto/res/find-all-inspection-target-infos-res.dto';
import { MyInspectionTypeResDto } from '../application/dto/res/my-inspection-type-res.dto';
import { BulkUpdateCleaningServiceDto } from './dto/req/bulk-update-cleaning-service.dto';
import { ScheduleService } from '../schedule/schedule.service';
import { ScheduleRepository } from '../schedule/schedule.repository';
import { InspectorRepository } from 'src/inspector/inspector.repository';
import { ApplicationRepository } from '../application/application.repository';
import { AssignedTargetsResDto } from './dto/res/assigned-targets-res.dto';
import { InspectorApplicationWithDetails } from 'src/inspector/types/inspector-application-with-details.type';

@Loggable()
@Injectable()
export class InspectionTargetService {
  private readonly WEIGHT_FACTOR = 1.5;
  constructor(
    private readonly inspectionTargetRepository: InspectionTargetRepository,
    private readonly scheduleRepository: ScheduleRepository,
    private readonly scheduleService: ScheduleService,
    private readonly prismaService: PrismaService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
    private readonly inspectorRepository: InspectorRepository,
    private readonly applicationRepository: ApplicationRepository,
  ) {}

  async updateInspectionTargetsAndUpdateSlotCapacities(
    file: Express.Multer.File,
    scheduleUuid: string,
  ): Promise<{ count: number }> {
    await this.excelValidatorService.validateExcelFile(file);

    if (!file?.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error - Express.Multer.File의 buffer 타입과 ExcelJS가 기대하는 Buffer 타입이 불일치하지만 런타임에서는 정상 동작
    await workbook.xlsx.load(file.buffer);

    if (workbook.worksheets.length < 2) {
      throw new BadRequestException(
        'Excel file must have at least 2 sheets for comparison',
      );
    }

    const currentSemesterSheet = workbook.worksheets[0];
    const nextSemesterSheet = workbook.worksheets[1];

    if (!currentSemesterSheet || !nextSemesterSheet) {
      throw new BadRequestException('Excel file has invalid sheets');
    }

    const currentSemesterRooms =
      this.excelParserService.parseSheetToRoomInfoMap(currentSemesterSheet);
    const nextSemesterRooms =
      this.excelParserService.parseSheetToRoomInfoMap(nextSemesterSheet);

    const inspectionTargets = this.findInspectionTargetRooms(
      currentSemesterRooms,
      nextSemesterRooms,
    );

    const targetCounts =
      this.scheduleService.calculateTargetCountsFromInspectionTargets(
        inspectionTargets,
      );

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const schedule =
          await this.scheduleRepository.findMoveOutScheduleWithSlotsByUuidWithXLockInTx(
            scheduleUuid,
            tx,
          );

        const now = new Date();
        if (now >= schedule.applicationStartTime) {
          throw new ForbiddenException(
            'Inspection targets cannot be replaced after the application period has started.',
          );
        }

        if (!schedule.inspectionSlots?.length) {
          throw new BadRequestException(
            'Schedule has no slots. Cannot update inspection targets.',
          );
        }

        const slotCount = schedule.inspectionSlots.length;
        const { maleCapacity, femaleCapacity } =
          this.scheduleService.calculateCapacity(
            slotCount,
            targetCounts,
            this.WEIGHT_FACTOR,
          );

        await this.inspectionTargetRepository.deleteInspectionTargetsByScheduleUuidInTx(
          scheduleUuid,
          tx,
        );

        const createdCount =
          await this.inspectionTargetRepository.createInspectionTargetsInTx(
            scheduleUuid,
            inspectionTargets,
            tx,
          );

        await this.scheduleRepository.updateSlotCapacitiesByScheduleUuidInTx(
          scheduleUuid,
          maleCapacity,
          femaleCapacity,
          tx,
        );

        return createdCount;
      },
    );
  }

  async bulkUpdateCleaningService(
    scheduleUuid: string,
    { targetUuids, applyCleaningService }: BulkUpdateCleaningServiceDto,
  ): Promise<void> {
    const uniqueTargetUuids = [...new Set(targetUuids)];

    const schedule =
      await this.scheduleRepository.findMoveOutScheduleWithSlotsByUuid(
        scheduleUuid,
      );

    if (schedule.status !== ScheduleStatus.DRAFT) {
      throw new ForbiddenException(
        'Cleaning service application can be modified only when the schedule status is DRAFT.',
      );
    }

    const count =
      await this.inspectionTargetRepository.countInspectionTargetsByScheduleAndUuids(
        scheduleUuid,
        uniqueTargetUuids,
      );

    if (count !== uniqueTargetUuids.length) {
      throw new BadRequestException(
        'Request contains invalid inspection target UUID(s).',
      );
    }

    await this.inspectionTargetRepository.updateApplyCleaningServiceByScheduleAndUuids(
      scheduleUuid,
      uniqueTargetUuids,
      applyCleaningService,
    );
  }

  async findTargetInfoByUserInfo(
    user: User,
  ): Promise<{ gender: Gender; roomNumber: string } | null> {
    try {
      const schedule =
        await this.scheduleRepository.findActiveMoveOutScheduleWithSlots();

      const admissionYear = this.extractAdmissionYear(user.studentNumber);

      const targetInfo =
        await this.inspectionTargetRepository.findInspectionTargetInfoByUserInfo(
          admissionYear,
          user.name,
          schedule.uuid,
        );

      return {
        gender: this.extractGenderFromHouseName(targetInfo.houseName)
          ? Gender.MALE
          : Gender.FEMALE,
        roomNumber: targetInfo.roomNumber,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        return null;
      throw error;
    }
  }

  async findMyInspectionTypeBySlot(
    user: User,
  ): Promise<MyInspectionTypeResDto> {
    const admissionYear = this.extractAdmissionYear(user.studentNumber);

    const schedule = await this.scheduleRepository.findActiveSchedule();

    const targetInfo =
      await this.inspectionTargetRepository.findInspectionTargetInfoByUserInfo(
        admissionYear,
        user.name,
        schedule.uuid,
      );

    return new MyInspectionTypeResDto(targetInfo);
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

    const schedule = await this.scheduleRepository.findActiveSchedule();

    const latestApplications: InspectorApplicationWithDetails[] =
      await this.applicationRepository.findLatestApplicationsByInspector(
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

  async findAllInspectionTargetInfoByScheduleUuid(
    scheduleUuid: string,
  ): Promise<InspectionTargetsGroupedByRoomResDto[]> {
    const inspectionTargetInfosWithApplications =
      await this.inspectionTargetRepository.findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid(
        scheduleUuid,
      );
    return inspectionTargetInfosWithApplications.map(
      (target): InspectionTargetsGroupedByRoomResDto => {
        const residents = [
          target.student1Name && target.student1AdmissionYear
            ? {
                admissionYear: target.student1AdmissionYear,
                name: target.student1Name,
              }
            : null,
          target.student2Name && target.student2AdmissionYear
            ? {
                admissionYear: target.student2AdmissionYear,
                name: target.student2Name,
              }
            : null,
          target.student3Name && target.student3AdmissionYear
            ? {
                admissionYear: target.student3AdmissionYear,
                name: target.student3Name,
              }
            : null,
        ].filter(
          (v): v is { admissionYear: string; name: string } => v !== null,
        );

        const [latestApplication, previousApplication] =
          target.inspectionApplication;

        let lastInspectionTime: Date | null = null;

        if (latestApplication && latestApplication.isPassed !== null) {
          lastInspectionTime = latestApplication.updatedAt;
        } else if (
          previousApplication &&
          previousApplication.isPassed !== null
        ) {
          lastInspectionTime = previousApplication.updatedAt;
        }

        return {
          uuid: target.uuid,
          roomNumber: target.roomNumber,
          residents,
          inspectionType: target.inspectionType,
          inspectionCount: target.inspectionCount,
          applyCleaningService: target.applyCleaningService,
          lastInspectionTime,
          isPassed: latestApplication?.isPassed ?? null,
        };
      },
    );
  }

  public findInspectionTargetRooms(
    currentSemesterRooms: Map<string, RoomInfo>,
    nextSemesterRooms: Map<string, RoomInfo>,
  ): InspectionTargetStudent[] {
    const inspectionTargets: InspectionTargetStudent[] = [];

    for (const [
      roomKey,
      currentSemesterRoom,
    ] of currentSemesterRooms.entries()) {
      const nextSemesterRoom = nextSemesterRooms.get(roomKey);

      const originalStudents = currentSemesterRoom.students.filter(
        (s): s is { name: string; admissionYear: string } =>
          !!s && !!s.name && !!s.admissionYear,
      );

      const leavingStudents = originalStudents
        .filter((current) => {
          if (!nextSemesterRoom || nextSemesterRoom.students.length === 0) {
            return true;
          }
          return !nextSemesterRoom.students.some(
            (next) =>
              current.name === next.name &&
              current.admissionYear === next.admissionYear,
          );
        })
        .map((s) => ({
          studentName: s.name,
          admissionYear: s.admissionYear,
        }));

      const originalCount = originalStudents.length;
      const leavingCount = leavingStudents.length;

      let inspectionType: RoomInspectionType;
      if (originalCount === 0) {
        inspectionType = RoomInspectionType.EMPTY;
      } else if (originalCount === leavingCount) {
        inspectionType = RoomInspectionType.FULL;
      } else if (originalCount >= 1 && leavingCount === 1) {
        inspectionType = RoomInspectionType.SOLO;
      } else if (originalCount === 3 && leavingCount === 2) {
        inspectionType = RoomInspectionType.DUO;
      } else {
        inspectionType = RoomInspectionType.FULL;
      }

      if (originalCount > 0 && leavingCount === 0) {
        continue;
      }

      inspectionTargets.push({
        houseName: currentSemesterRoom.houseName,
        roomNumber: currentSemesterRoom.roomNumber,
        students: leavingStudents.slice(0, 3),
        inspectionType,
        applyCleaningService: false,
      });
    }

    return inspectionTargets;
  }

  public extractGenderFromHouseName(houseName: string): boolean {
    const lastParenMatch = houseName.match(/\(([^()]*)\)\s*$/);
    const genderToken = lastParenMatch?.[1]?.trim();

    if (genderToken === '남') {
      return true;
    }
    if (genderToken === '여') {
      return false;
    }

    throw new BadRequestException(
      `Invalid InspectionTargetInfo.houseName format. Expected last token "(남)" or "(여)". Regenerate inspection targets and retry. Invalid houseName: ${houseName}`,
    );
  }

  public extractAdmissionYear(studentNumber: string): string {
    if (!studentNumber || studentNumber.length < 4) {
      throw new BadRequestException('Invalid student number format');
    }
    return studentNumber.substring(2, 4);
  }
}
