import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { MoveOutRepository } from './move-out.repository';
import { MoveOutSchedule, Season } from 'generated/prisma/client';
import { Semester } from './types/semester.type';
import {
  CreateMoveOutScheduleDto,
  InspectionTimeRangeDto,
} from './dto/req/create-move-out-schedule.dto';
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
import { MoveOutScheduleWithSlots } from './types/move-out-schedule-with-slots.type';
import { InspectionTargetCount } from './types/inspection-target-count.type';
import { User } from 'generated/prisma/client';
import { ApplyInspectionDto } from './dto/req/apply-inspection.dto';
import { UpdateInspectionDto } from './dto/req/update-inspection.dto';
import { InspectionResDto } from './dto/res/inspection-res.dto';
import { InspectorResDto } from 'src/inspector/dto/res/inspector-res.dto';

@Loggable()
@Injectable()
export class MoveOutService {
  private readonly SLOT_DURATION_MINUTES = 30;
  private readonly WEIGHT_FACTOR = 1.5;
  private readonly UPDATE_DEADLINE_HOURS = 1;
  private readonly INSPECTION_COUNT_LIMIT = 3;
  constructor(
    private readonly moveOutRepository: MoveOutRepository,
    private readonly prismaService: PrismaService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
  ) {}

  async findAllMoveOutSchedules(): Promise<MoveOutSchedule[]> {
    return await this.moveOutRepository.findAllMoveOutSchedules();
  }

  async createMoveOutSchedule({
    title,
    applicationStartTime,
    applicationEndTime,
    currentYear,
    currentSeason,
    nextYear,
    nextSeason,
    inspectionTimeRange,
  }: CreateMoveOutScheduleDto): Promise<MoveOutSchedule> {
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

    const currentSemesterEntity =
      await this.moveOutRepository.findSemesterByYearAndSeason(
        currentSemester.year,
        currentSemester.season,
      );
    const nextSemesterEntity =
      await this.moveOutRepository.findSemesterByYearAndSeason(
        nextSemester.year,
        nextSemester.season,
      );

    const targetCounts = await this.calculateTargetCounts(
      currentSemesterEntity.uuid,
      nextSemesterEntity.uuid,
    );

    const generatedSlots = this.generateSlots(
      inspectionTimeRange,
      this.SLOT_DURATION_MINUTES,
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

    return await this.moveOutRepository.createMoveOutSchedule(
      scheduleData,
      slotsData,
    );
  }

  /* async updateMoveOutSchedule(
    id: number,
    updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    const schedule =
      await this.moveOutRepository.findMoveOutScheduleWithSlotsById(id);

    const updatedMoveOutScheduleDates: MoveOutScheduleDates = {
      ...schedule,
      ...updateMoveOutScheduleDto,
    };

    this.validateScheduleAndRanges(updatedMoveOutScheduleDates);

    return await this.moveOutRepository.updateMoveOutSchedule(
      id,
      updateMoveOutScheduleDto,
    );
  } */

  async findMoveOutScheduleWithSlots(
    id: number,
  ): Promise<MoveOutScheduleWithSlots> {
    return await this.moveOutRepository.findMoveOutScheduleWithSlotsById(id);
  }

  async findInspectorsBySlotUuid(uuid: string): Promise<InspectorResDto[]> {
    const inspectors =
      await this.moveOutRepository.findInspectorBySlotUuid(uuid);
    return inspectors.map((inspector) => new InspectorResDto(inspector));
  }

  async compareTwoSheetsAndFindInspectionTargets(
    file: Express.Multer.File | undefined,
    currentSemester: Semester,
    nextSemester: Semester,
  ): Promise<number> {
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
      await this.moveOutRepository.findOrCreateSemester(
        currentSemester.year,
        currentSemester.season,
      );
    const nextSemesterEntity =
      await this.moveOutRepository.findOrCreateSemester(
        nextSemester.year,
        nextSemester.season,
      );

    const result = await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const existingTargetInfo =
          await this.moveOutRepository.findFirstInspectionTargetInfoBySemestersInTx(
            currentSemesterEntity.uuid,
            nextSemesterEntity.uuid,
            tx,
          );

        if (existingTargetInfo !== null) {
          throw new ConflictException(
            `Inspection target info already exist for current semester (${currentSemester.year} ${currentSemester.season}) and next semester (${nextSemester.year} ${nextSemester.season}). Use update endpoint to modify existing data.`,
          );
        }

        return await this.moveOutRepository.createInspectionTargetInfosInTx(
          currentSemesterEntity.uuid,
          nextSemesterEntity.uuid,
          inspectionTargets,
          tx,
        );
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    return result.count;
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

      for (const currentSemesterStudent of currentSemesterRoom.students) {
        if (
          !currentSemesterStudent.name ||
          !currentSemesterStudent.admissionYear
        ) {
          continue;
        }

        if (!nextSemesterRoom || nextSemesterRoom.students.length === 0) {
          inspectionTargets.push({
            houseName: currentSemesterRoom.houseName,
            roomNumber: currentSemesterRoom.roomNumber,
            studentName: currentSemesterStudent.name,
            admissionYear: currentSemesterStudent.admissionYear,
          });
          continue;
        }

        const studentStillInRoom = nextSemesterRoom.students.some(
          (nextSemesterStudent) =>
            currentSemesterStudent.name === nextSemesterStudent.name &&
            currentSemesterStudent.admissionYear ===
              nextSemesterStudent.admissionYear,
        );

        if (!studentStillInRoom) {
          inspectionTargets.push({
            houseName: currentSemesterRoom.houseName,
            roomNumber: currentSemesterRoom.roomNumber,
            studentName: currentSemesterStudent.name,
            admissionYear: currentSemesterStudent.admissionYear,
          });
        }
      }
    }

    return inspectionTargets;
  }

  private async calculateTargetCounts(
    currentSemesterUuid: string,
    nextSemesterUuid: string,
  ): Promise<InspectionTargetCount> {
    const targets =
      await this.moveOutRepository.findInspectionTargetHouseNamesBySemesters(
        currentSemesterUuid,
        nextSemesterUuid,
      );

    const counts: InspectionTargetCount = { male: 0, female: 0 };

    for (const { houseName } of targets) {
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

  private generateSlots(
    inspectionTimeRanges: InspectionTimeRangeDto[],
    slotDurationMinute: number,
  ): { startTime: Date; endTime: Date }[] {
    const slots: { startTime: Date; endTime: Date }[] = [];
    const SLOT_DURATION_MS = slotDurationMinute * 60000;

    for (const range of inspectionTimeRanges) {
      const rangeStart = new Date(range.start);
      const rangeEndMs = new Date(range.end).getTime();

      let slotStart = rangeStart;
      for (
        let slotEndMs = rangeStart.getTime() + SLOT_DURATION_MS;
        slotEndMs <= rangeEndMs;
        slotEndMs += SLOT_DURATION_MS
      ) {
        const slotEnd = new Date(slotEndMs);
        slots.push({ startTime: slotStart, endTime: slotEnd });
        slotStart = slotEnd;
      }
    }
    return slots;
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

  private validateScheduleAndRanges(
    applicationStartTime: Date,
    applicationEndTime: Date,
    inspectionTimeRange: InspectionTimeRangeDto[],
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

  private extractAdmissionYear(studentNumber: string): string {
    if (!studentNumber || studentNumber.length < 4) {
      throw new BadRequestException('Invalid student number format');
    }
    return studentNumber.substring(2, 4);
  }

  private extractGenderFromHouseName(houseName: string): boolean {
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

  async applyInspection(
    user: User,
    { inspectionSlotUuid }: ApplyInspectionDto,
  ): Promise<{ applicationUuid: string }> {
    const admissionYear = this.extractAdmissionYear(user.studentNumber);

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const schedule =
          await this.moveOutRepository.findMoveOutScheduleBySlotUuidInTx(
            inspectionSlotUuid,
            tx,
          );

        const now = new Date();
        if (now < schedule.applicationStartTime) {
          throw new ForbiddenException(
            'Application period has not started yet.',
          );
        }

        if (now > schedule.applicationEndTime) {
          throw new ForbiddenException('Application period has ended.');
        }

        const inspectionTargetInfo =
          await this.moveOutRepository.findInspectionTargetInfoByUserInfoInTx(
            admissionYear,
            user.name,
            schedule.currentSemesterUuid,
            schedule.nextSemesterUuid,
            tx,
          );

        const isMale = this.extractGenderFromHouseName(
          inspectionTargetInfo.houseName,
        );

        const slot = await this.moveOutRepository.findInspectionSlotByUuidInTx(
          inspectionSlotUuid,
          tx,
        );

        if (isMale) {
          if (slot.maleReservedCount >= slot.maleCapacity) {
            throw new ConflictException('Male capacity is already full.');
          }
        } else {
          if (slot.femaleReservedCount >= slot.femaleCapacity) {
            throw new ConflictException('Female capacity is already full.');
          }
        }

        if (
          inspectionTargetInfo.inspectionCount >= this.INSPECTION_COUNT_LIMIT
        ) {
          throw new ConflictException(
            'Inspection count limit(3times) exceeded.',
          );
        }

        await this.moveOutRepository.incrementSlotReservedCountInTx(
          inspectionSlotUuid,
          isMale,
          tx,
        );
        await this.moveOutRepository.incrementInspectionCountInTx(
          inspectionTargetInfo.uuid,
          tx,
        );

        const application =
          await this.moveOutRepository.createInspectionApplicationInTx(
            user.uuid,
            inspectionTargetInfo.uuid,
            inspectionSlotUuid,
            tx,
          );

        return { applicationUuid: application.uuid };
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async updateInspection(
    user: User,
    applicationUuid: string,
    { inspectionSlotUuid }: UpdateInspectionDto,
  ): Promise<{ applicationUuid: string }> {
    const UPDATE_DEADLINE_MS = this.UPDATE_DEADLINE_HOURS * 60 * 60 * 1000;
    const admissionYear = this.extractAdmissionYear(user.studentNumber);

    return this.prismaService.$transaction(
      async (tx) => {
        const application =
          await this.moveOutRepository.findApplicationByUuidInTx(
            applicationUuid,
            tx,
          );

        if (application.userUuid != user.uuid) {
          throw new ForbiddenException(
            'The application does not belong to this user.',
          );
        }

        const now = new Date();
        const timeDiff =
          application.inspectionSlot.startTime.getTime() - now.getTime();

        const schedule =
          await this.moveOutRepository.findMoveOutScheduleBySlotUuidInTx(
            inspectionSlotUuid,
            tx,
          );

        const inspectionTargetInfo =
          await this.moveOutRepository.findInspectionTargetInfoByUserInfoInTx(
            admissionYear,
            user.name,
            schedule.currentSemesterUuid,
            schedule.nextSemesterUuid,
            tx,
          );

        const isMale = this.extractGenderFromHouseName(
          inspectionTargetInfo.houseName,
        );

        const updatedSlot =
          await this.moveOutRepository.findInspectionSlotByUuidInTx(
            inspectionSlotUuid,
            tx,
          );

        if (application.inspectionSlot.scheduleId !== updatedSlot.scheduleId) {
          throw new BadRequestException(
            'Changes are only possible within the same schedule.',
          );
        }

        if (timeDiff < UPDATE_DEADLINE_MS) {
          throw new ForbiddenException(
            'Cannot modify the inspection time within 1 hour of the start time.',
          );
        }

        if (isMale) {
          if (updatedSlot.maleReservedCount >= updatedSlot.maleCapacity) {
            throw new ConflictException('Male capacity is already full.');
          }
        } else {
          if (updatedSlot.femaleReservedCount >= updatedSlot.femaleCapacity) {
            throw new ConflictException('Female capacity is already full.');
          }
        }

        await this.moveOutRepository.decrementSlotReservedCountInTx(
          application.inspectionSlotUuid,
          isMale,
          tx,
        );

        await this.moveOutRepository.incrementSlotReservedCountInTx(
          inspectionSlotUuid,
          isMale,
          tx,
        );

        const updatedApplication =
          await this.moveOutRepository.updateInspectionApplicationInTx(
            application.uuid,
            inspectionSlotUuid,
            tx,
          );

        return { applicationUuid: updatedApplication.uuid };
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async cancelInspection(user: User, applicationUuid: string): Promise<void> {
    const UPDATE_DEADLINE_MS = this.UPDATE_DEADLINE_HOURS * 60 * 60 * 1000;

    return await this.prismaService.$transaction(
      async (tx) => {
        const application =
          await this.moveOutRepository.findApplicationByUuidInTx(
            applicationUuid,
            tx,
          );

        if (application.userUuid != user.uuid) {
          throw new ForbiddenException(
            'The application does not belong to this user.',
          );
        }

        const now = new Date();
        const timeDiff =
          application.inspectionSlot.startTime.getTime() - now.getTime();

        if (timeDiff >= UPDATE_DEADLINE_MS) {
          await this.moveOutRepository.decrementInspectionCountInTx(
            application.inspectionTargetInfo.uuid,
            tx,
          );
        }

        const isMale = this.extractGenderFromHouseName(
          application.inspectionTargetInfo.houseName,
        );

        await this.moveOutRepository.decrementSlotReservedCountInTx(
          application.inspectionSlotUuid,
          isMale,
          tx,
        );

        await this.moveOutRepository.deleteInspectionApplicationInTx(
          application.uuid,
          tx,
        );
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findMyInspection(user: User): Promise<InspectionResDto> {
    const schedule = await this.moveOutRepository.findActiveSchedule();
    const application =
      await this.moveOutRepository.findApplicationByUserAndSemesters(
        user.uuid,
        schedule.currentSemesterUuid,
        schedule.nextSemesterUuid,
      );

    return {
      applicationUuid: application.uuid,
      inspectionSlot: { ...application.inspectionSlot },
      isPassed: application.isPassed ?? undefined,
    };
  }
}
