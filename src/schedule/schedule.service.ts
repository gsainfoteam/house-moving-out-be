import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ScheduleRepository } from './schedule.repository';
import {
  MoveOutSchedule,
  RoomInspectionType,
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
import { InspectionTargetStudent } from '../inspection-target/types/inspection-target.type';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';
import { MoveOutScheduleWithSlots } from './types/move-out-schedule-with-slots.type';
import { InspectionTargetCount } from '../inspection-target/types/inspection-target-count.type';
import { User } from 'generated/prisma/client';
import ms from 'ms';
import { InspectorResDto } from 'src/inspector/dto/res/inspector-res.dto';
import { CreateMoveOutScheduleWithTargetsDto } from './dto/req/create-move-out-schedule-with-targets.dto';
import { InspectionTargetRepository } from '../inspection-target/inspection-target.repository';
import { InspectionTargetService } from 'src/inspection-target/inspection-target.service';

@Loggable()
@Injectable()
export class ScheduleService {
  private readonly SLOT_DURATION = ms('30m');
  private readonly WEIGHT_FACTOR = 1.5;
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly inspectionTargetRepository: InspectionTargetRepository,
    private readonly inspectionTargetService: InspectionTargetService,
    private readonly prismaService: PrismaService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
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

        await this.inspectionTargetRepository.createInspectionTargetsInTx(
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

    const admissionYear = this.inspectionTargetService.extractAdmissionYear(
      user.studentNumber,
    );

    await this.inspectionTargetRepository.findInspectionTargetInfoByUserInfo(
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

  public calculateCapacity(
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

  public calculateTargetCountsFromInspectionTargets(
    inspectionTargets: InspectionTargetStudent[],
  ): InspectionTargetCount {
    const counts: InspectionTargetCount = { male: 0, female: 0 };

    for (const { houseName } of inspectionTargets) {
      const isMale =
        this.inspectionTargetService.extractGenderFromHouseName(houseName);
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
