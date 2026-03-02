import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScheduleRepository } from './schedule.repository';
import {
  Gender,
  MoveOutSchedule,
  RoomInspectionType,
  ScheduleStatus,
  Season,
} from 'generated/prisma/client';
import { Semester } from './types/semester.type';
import { InspectionTimeRange } from './dto/req/create-move-out-schedule-with-targets.dto';
import { Loggable } from '@lib/logger';
import * as ExcelJS from 'exceljs';
import {
  RoomInfo,
  ExcelParserService,
  ExcelValidatorService,
} from '@lib/excel-parser';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';
import { MoveOutScheduleWithSlots } from './types/move-out-schedule-with-slots.type';
import { User } from 'generated/prisma/client';
import ms from 'ms';
import { InspectorResDto } from 'src/inspector/dto/res/inspector-res.dto';
import { CreateMoveOutScheduleWithTargetsDto } from './dto/req/create-move-out-schedule-with-targets.dto';
import { InspectionTargetStudent } from './types/inspection-target.type';
import { InspectionTargetCount } from './types/inspection-target-count.type';
import { BulkUpdateCleaningServiceDto } from './dto/req/bulk-update-cleaning-service.dto';
import { InspectionTargetsGroupedByRoomResDto } from './dto/res/find-all-inspection-target-infos-res.dto';
import { ApplicationListQueryDto } from 'src/schedule/dto/req/application-list-query.dto';
import { ApplicationListResDto } from 'src/application/dto/res/application-res.dto';
import { FileService } from '@lib/file';

@Loggable()
@Injectable()
export class ScheduleService {
  private readonly SLOT_DURATION = ms('30m');
  private readonly WEIGHT_FACTOR = 1.5;
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly prismaService: PrismaService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
    private readonly fileService: FileService,
  ) {}

  async findAllMoveOutSchedules(): Promise<MoveOutSchedule[]> {
    return await this.scheduleRepository.findAllMoveOutSchedules();
  }

  async createMoveOutScheduleWithTargets(
    file: Express.Multer.File,
    {
      title,
      applicationStartTime,
      applicationEndTime,
      currentYear,
      currentSeason,
      nextYear,
      nextSeason,
      inspectionTimeRange,
    }: CreateMoveOutScheduleWithTargetsDto,
  ): Promise<MoveOutSchedule> {
    this.validateScheduleAndRanges(
      applicationStartTime,
      applicationEndTime,
      inspectionTimeRange,
    );

    const currentSemester: Semester = {
      year: currentYear,
      season: currentSeason,
    };
    const nextSemester: Semester = {
      year: nextYear,
      season: nextSeason,
    };

    this.validateSemesterOrder(currentSemester, nextSemester);

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

    const currentSemesterEntity =
      await this.scheduleRepository.findOrCreateSemester(
        currentSemester.year,
        currentSemester.season,
      );
    const nextSemesterEntity =
      await this.scheduleRepository.findOrCreateSemester(
        nextSemester.year,
        nextSemester.season,
      );

    const targetCounts =
      this.calculateTargetCountsFromInspectionTargets(inspectionTargets);

    const generatedSlots = this.generateSlots(
      inspectionTimeRange,
      this.SLOT_DURATION,
    );

    if (generatedSlots.length === 0) {
      throw new BadRequestException(
        'No slots were generated. Check your inspection time ranges.',
      );
    }

    const { maleCapacity, femaleCapacity } = this.calculateCapacity(
      generatedSlots.length,
      targetCounts,
      this.WEIGHT_FACTOR,
    );

    const slotsData = generatedSlots.map((slot) => ({
      ...slot,
      maleCapacity,
      femaleCapacity,
    }));

    const scheduleData = {
      title,
      applicationStartTime,
      applicationEndTime,
      currentSemesterUuid: currentSemesterEntity.uuid,
      nextSemesterUuid: nextSemesterEntity.uuid,
    };

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const schedule =
          await this.scheduleRepository.createMoveOutScheduleInTx(
            scheduleData,
            slotsData,
            tx,
          );

        await this.scheduleRepository.createInspectionTargetsInTx(
          schedule.uuid,
          inspectionTargets,
          tx,
        );

        return schedule;
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async findMoveOutScheduleWithSlots(
    uuid: string,
  ): Promise<MoveOutScheduleWithSlots> {
    return await this.scheduleRepository.findMoveOutScheduleWithSlotsByUuid(
      uuid,
    );
  }

  async findActiveMoveOutScheduleWithSlots(
    user: User,
  ): Promise<MoveOutScheduleWithSlots> {
    const schedule =
      await this.scheduleRepository.findActiveMoveOutScheduleWithSlots();

    const now = new Date();
    if (now < schedule.applicationStartTime) {
      throw new ForbiddenException('Application period has not started yet.');
    }

    if (now > schedule.applicationEndTime) {
      throw new ForbiddenException('Application period has ended.');
    }

    const admissionYear = this.extractAdmissionYear(user.studentNumber);

    await this.scheduleRepository.findInspectionTargetInfoByUserInfo(
      admissionYear,
      user.name,
      schedule.uuid,
    );

    return schedule;
  }

  async findInspectorsByScheduleUuid(uuid: string): Promise<InspectorResDto[]> {
    const inspectors =
      await this.scheduleRepository.findInspectorByScheduleUuid(uuid);
    return inspectors.map((inspector) => new InspectorResDto(inspector));
  }

  async findApplicationsByScheduleUuid(
    { offset, limit }: ApplicationListQueryDto,
    scheduleUuid: string,
  ): Promise<ApplicationListResDto> {
    const [applications, totalCount] = await Promise.all([
      this.scheduleRepository.findApplicationsByScheduleUuid(
        offset ?? 0,
        limit ?? 20,
        scheduleUuid,
      ),
      this.scheduleRepository.countApplications(scheduleUuid),
    ]);
    return new ApplicationListResDto(
      await Promise.all(
        applications.map(async (app) => ({
          ...app,
          document:
            app.document === null
              ? null
              : await this.fileService.getUrl(app.document),
        })),
      ),
      totalCount,
    );
  }

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
      this.calculateTargetCountsFromInspectionTargets(inspectionTargets);

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
        const { maleCapacity, femaleCapacity } = this.calculateCapacity(
          slotCount,
          targetCounts,
          this.WEIGHT_FACTOR,
        );

        await this.scheduleRepository.deleteInspectionTargetsByScheduleUuidInTx(
          scheduleUuid,
          tx,
        );

        const createdCount =
          await this.scheduleRepository.createInspectionTargetsInTx(
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

    await this.prismaService.$transaction(async (tx: PrismaTransaction) => {
      const schedule =
        await this.scheduleRepository.findMoveOutScheduleWithSlotsByUuidWithXLockInTx(
          scheduleUuid,
          tx,
        );

      if (schedule.status !== ScheduleStatus.DRAFT) {
        throw new ForbiddenException(
          'Cleaning service application can be modified only when the schedule status is DRAFT.',
        );
      }

      const count =
        await this.scheduleRepository.countInspectionTargetsByScheduleAndUuidsInTx(
          scheduleUuid,
          uniqueTargetUuids,
          tx,
        );

      if (count !== uniqueTargetUuids.length) {
        throw new BadRequestException(
          'Request contains invalid inspection target UUID(s).',
        );
      }

      await this.scheduleRepository.updateApplyCleaningServiceByScheduleAndUuidsInTx(
        scheduleUuid,
        uniqueTargetUuids,
        applyCleaningService,
        tx,
      );
    });
  }

  async findTargetInfoByUserInfo(
    user: User,
  ): Promise<{ gender: Gender; roomNumber: string } | null> {
    try {
      const schedule =
        await this.scheduleRepository.findActiveMoveOutScheduleWithSlots();

      const admissionYear = this.extractAdmissionYear(user.studentNumber);

      const targetInfo =
        await this.scheduleRepository.findInspectionTargetInfoByUserInfo(
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

  async findAllInspectionTargetInfoByScheduleUuid(
    scheduleUuid: string,
  ): Promise<InspectionTargetsGroupedByRoomResDto[]> {
    const inspectionTargetInfosWithApplications =
      await this.scheduleRepository.findAllInspectionTargetInfoWithApplicationAndSlotByScheduleUuid(
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

  private findInspectionTargetRooms(
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

  private calculateCapacity(
    totalSlots: number,
    targetCounts: InspectionTargetCount,
    weightFactor: number,
  ): {
    maleCapacity: number;
    femaleCapacity: number;
  } {
    const totalTargetCount = targetCounts.male + targetCounts.female;
    const weightedTotalCount = totalTargetCount * weightFactor;
    const totalCapacity = Math.ceil(weightedTotalCount / totalSlots);

    if (totalTargetCount === 0) {
      return {
        maleCapacity: 0,
        femaleCapacity: 0,
      };
    }

    const maleRatio = targetCounts.male / totalTargetCount;
    const femaleRatio = targetCounts.female / totalTargetCount;

    const maleCapacity = Math.ceil(totalCapacity * maleRatio);
    const femaleCapacity = Math.ceil(totalCapacity * femaleRatio);

    return {
      maleCapacity,
      femaleCapacity,
    };
  }

  private calculateTargetCountsFromInspectionTargets(
    inspectionTargets: InspectionTargetStudent[],
  ): InspectionTargetCount {
    const counts: InspectionTargetCount = { male: 0, female: 0 };

    for (const { houseName } of inspectionTargets) {
      const isMale = this.extractGenderFromHouseName(houseName);
      if (isMale) {
        counts.male += 1;
      } else {
        counts.female += 1;
      }
    }

    if (counts.male === 0 && counts.female === 0) {
      throw new BadRequestException(
        'Inspection target info not found for the given semesters.',
      );
    }

    return counts;
  }

  extractGenderFromHouseName(houseName: string): boolean {
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

  extractAdmissionYear(studentNumber: string): string {
    if (!studentNumber || studentNumber.length < 4) {
      throw new BadRequestException('Invalid student number format');
    }
    return studentNumber.substring(2, 4);
  }

  private generateSlots(
    inspectionTimeRanges: InspectionTimeRange[],
    slotDuration: number,
  ): { startTime: Date; endTime: Date }[] {
    const slots: { startTime: Date; endTime: Date }[] = [];

    for (const range of inspectionTimeRanges) {
      const rangeStart = new Date(range.start);
      const rangeEndMs = new Date(range.end).getTime();

      let slotStart = rangeStart;
      for (
        let slotEndMs = rangeStart.getTime() + slotDuration;
        slotEndMs <= rangeEndMs;
        slotEndMs += slotDuration
      ) {
        const slotEnd = new Date(slotEndMs);
        slots.push({ startTime: slotStart, endTime: slotEnd });
        slotStart = slotEnd;
      }
    }
    return slots;
  }

  private validateScheduleAndRanges(
    applicationStartTime: Date,
    applicationEndTime: Date,
    inspectionTimeRange: InspectionTimeRange[],
  ): void {
    if (!inspectionTimeRange || inspectionTimeRange.length === 0) {
      throw new BadRequestException('Inspection time range must be provided.');
    }

    inspectionTimeRange.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (let i = 0; i < inspectionTimeRange.length; i++) {
      const currentStartTime = inspectionTimeRange[i].start.getTime();
      const currentEndTime = inspectionTimeRange[i].end.getTime();

      if (currentStartTime >= currentEndTime) {
        throw new BadRequestException(
          `Inspection range #${i + 1}: start time must be before end time.`,
        );
      }

      if (i > 0) {
        const prevEnd = inspectionTimeRange[i - 1].end.getTime();
        if (currentStartTime < prevEnd) {
          throw new BadRequestException(
            'Inspection time ranges must not overlap.',
          );
        }
      }
    }

    const inspectionStartTime = inspectionTimeRange[0].start;
    const inspectionEndTime =
      inspectionTimeRange[inspectionTimeRange.length - 1].end;

    if (applicationStartTime > applicationEndTime) {
      throw new BadRequestException(
        'Application start date cannot be after application end date',
      );
    }
    if (inspectionStartTime > inspectionEndTime) {
      throw new BadRequestException(
        'Inspection start date cannot be after inspection end date',
      );
    }
    if (applicationStartTime > inspectionStartTime) {
      throw new BadRequestException(
        'Application start date cannot be after inspection start date',
      );
    }
    if (applicationEndTime > inspectionEndTime) {
      throw new BadRequestException(
        'Application end date cannot be after inspection end date',
      );
    }
  }

  private validateSemesterOrder(
    currentSemester: Semester,
    nextSemester: Semester,
  ): void {
    const { year: currentYear, season: currentSeason } = currentSemester;
    const { year: nextYear, season: nextSeason } = nextSemester;

    if (currentYear > nextYear) {
      throw new BadRequestException(
        `Current semester (${currentYear} ${currentSeason}) must be before next semester (${nextYear} ${nextSeason})`,
      );
    }

    if (currentYear === nextYear) {
      const seasonOrder: Record<Season, number> = {
        [Season.SPRING]: 0,
        [Season.SUMMER]: 1,
        [Season.FALL]: 2,
        [Season.WINTER]: 3,
      };

      if (seasonOrder[currentSeason] >= seasonOrder[nextSeason]) {
        throw new BadRequestException(
          `Current semester (${currentYear} ${currentSeason}) must be before next semester (${nextYear} ${nextSeason})`,
        );
      }
    }
  }
}
