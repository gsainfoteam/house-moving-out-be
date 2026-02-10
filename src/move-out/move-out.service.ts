import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MoveOutRepository } from './move-out.repository';
import { Gender, MoveOutSchedule, Season } from 'generated/prisma/client';
import { Semester } from './types/semester.type';
import { InspectionTimeRange } from './dto/req/create-move-out-schedule-with-targets.dto';
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
import { fileTypeFromBuffer } from 'file-type';
import ms from 'ms';
import { ApplicationUuidResDto } from './dto/res/application-uuid-res.dto';
import { InspectionTargetInfoResDto } from './dto/res/inspection-target-info-res.dto';
import { InspectionTargetsBySemestersQueryDto } from './dto/req/inspection-targets-by-semesters-query.dto';
import { CreateMoveOutScheduleWithTargetsDto } from './dto/req/create-move-out-schedule-with-targets.dto';
import { SubmitInspectionResultDto } from './dto/req/submit-inspection-result.dto';
import { InspectorService } from 'src/inspector/inspector.service';

@Loggable()
@Injectable()
export class MoveOutService {
  private readonly SLOT_DURATION = ms('30m');
  private readonly WEIGHT_FACTOR = 1.5;
  private readonly APPLICATION_UPDATE_DEADLINE = ms('1h');
  private readonly INSPECTION_COUNT_LIMIT = 3;
  private readonly MAX_APPLICATIONS_PER_INSPECTOR = 2;
  private readonly MAX_SIGNATURE_SIZE = 3 * 1024 * 1024;
  constructor(
    private readonly moveOutRepository: MoveOutRepository,
    private readonly prismaService: PrismaService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
    private readonly inspectorService: InspectorService,
  ) {}

  async findAllMoveOutSchedules(): Promise<MoveOutSchedule[]> {
    return await this.moveOutRepository.findAllMoveOutSchedules();
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
      await this.moveOutRepository.findOrCreateSemester(
        currentSemester.year,
        currentSemester.season,
      );
    const nextSemesterEntity =
      await this.moveOutRepository.findOrCreateSemester(
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
        const schedule = await this.moveOutRepository.createMoveOutScheduleInTx(
          scheduleData,
          slotsData,
          tx,
        );

        await this.moveOutRepository.createInspectionTargetsInTx(
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

  /* async updateMoveOutSchedule(
    uuid: string,
    updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    const schedule =
      await this.moveOutRepository.findMoveOutScheduleWithSlotsByUuid(uuid);

    const updatedMoveOutScheduleDates: MoveOutScheduleDates = {
      ...schedule,
      ...updateMoveOutScheduleDto,
    };

    this.validateScheduleAndRanges(updatedMoveOutScheduleDates);

    return await this.moveOutRepository.updateMoveOutSchedule(
      uuid,
      updateMoveOutScheduleDto,
    );
  } */

  async findMoveOutScheduleWithSlots(
    uuid: string,
  ): Promise<MoveOutScheduleWithSlots> {
    return await this.moveOutRepository.findMoveOutScheduleWithSlotsByUuid(
      uuid,
    );
  }

  async findActiveMoveOutScheduleWithSlots(
    user: User,
  ): Promise<MoveOutScheduleWithSlots> {
    const schedule =
      await this.moveOutRepository.findActiveMoveOutScheduleWithSlots();

    const now = new Date();
    if (now < schedule.applicationStartTime) {
      throw new ForbiddenException('Application period has not started yet.');
    }

    if (now > schedule.applicationEndTime) {
      throw new ForbiddenException('Application period has ended.');
    }

    const admissionYear = this.extractAdmissionYear(user.studentNumber);

    await this.moveOutRepository.findInspectionTargetInfoByUserInfo(
      admissionYear,
      user.name,
      schedule.uuid,
    );

    return schedule;
  }

  async findInspectorsByScheduleUuid(uuid: string): Promise<InspectorResDto[]> {
    const inspectors =
      await this.moveOutRepository.findInspectorByScheduleUuid(uuid);
    return inspectors.map((inspector) => new InspectorResDto(inspector));
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
          await this.moveOutRepository.findMoveOutScheduleWithSlotsByUuidWithXLockInTx(
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

        await this.moveOutRepository.deleteInspectionTargetsByScheduleUuidInTx(
          scheduleUuid,
          tx,
        );

        const createdCount =
          await this.moveOutRepository.createInspectionTargetsInTx(
            scheduleUuid,
            inspectionTargets,
            tx,
          );

        await this.moveOutRepository.updateSlotCapacitiesByScheduleUuidInTx(
          scheduleUuid,
          maleCapacity,
          femaleCapacity,
          tx,
        );

        return createdCount;
      },
    );
  }

  async findInspectionTargetsBySemesters({
    currentYear,
    currentSeason,
    nextYear,
    nextSeason,
  }: InspectionTargetsBySemestersQueryDto): Promise<
    InspectionTargetInfoResDto[]
  > {
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

    const schedule =
      await this.moveOutRepository.findMoveOutScheduleBySemesterUuids(
        currentSemesterEntity.uuid,
        nextSemesterEntity.uuid,
      );
    const targets =
      await this.moveOutRepository.findInspectionTargetInfosByScheduleUuid(
        schedule.uuid,
      );

    if (targets.length === 0) {
      throw new NotFoundException('Inspection targets not found');
    }

    return targets.map((target) => new InspectionTargetInfoResDto(target));
  }

  async deleteInspectionTargetsBySemesters({
    currentYear,
    currentSeason,
    nextYear,
    nextSeason,
  }: InspectionTargetsBySemestersQueryDto): Promise<{ count: number }> {
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

    const schedule =
      await this.moveOutRepository.findMoveOutScheduleBySemesterUuids(
        currentSemesterEntity.uuid,
        nextSemesterEntity.uuid,
      );
    const result =
      await this.moveOutRepository.deleteInspectionTargetInfosByScheduleUuid(
        schedule.uuid,
      );

    if (result.count === 0) {
      throw new NotFoundException('Inspection targets not found');
    }

    return {
      count: result.count,
    };
  }

  async findTargetInfoByUserInfo(
    user: User,
  ): Promise<{ gender: Gender; roomNumber: string } | null> {
    try {
      const schedule =
        await this.moveOutRepository.findActiveMoveOutScheduleWithSlots();

      const admissionYear = this.extractAdmissionYear(user.studentNumber);

      const targetInfo =
        await this.moveOutRepository.findInspectionTargetInfoByUserInfo(
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
  ): Promise<ApplicationUuidResDto> {
    const admissionYear = this.extractAdmissionYear(user.studentNumber);

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const { schedule } =
          await this.moveOutRepository.findInspectionSlotByUuidInTx(
            inspectionSlotUuid,
            tx,
          );
        const target =
          await this.moveOutRepository.findInspectionTargetInfoByUserInfo(
            admissionYear,
            user.name,
            schedule.uuid,
          );
        if (target.inspectionCount >= this.INSPECTION_COUNT_LIMIT) {
          throw new ConflictException(
            'Inspection count limit(3times) exceeded.',
          );
        }

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
            schedule.uuid,
            tx,
          );

        if (
          inspectionTargetInfo.inspectionCount >= this.INSPECTION_COUNT_LIMIT
        ) {
          throw new ConflictException(
            'Inspection count limit(3times) exceeded.',
          );
        }

        const isMale = this.extractGenderFromHouseName(
          inspectionTargetInfo.houseName,
        );

        await this.moveOutRepository.incrementInspectionCountInTx(
          inspectionTargetInfo.uuid,
          tx,
        );
        const updatedSlot =
          await this.moveOutRepository.incrementSlotReservedCountInTx(
            inspectionSlotUuid,
            isMale,
            tx,
          );

        if (isMale) {
          if (updatedSlot.maleReservedCount > updatedSlot.maleCapacity) {
            throw new ConflictException('Male capacity is already full.');
          }
        } else {
          if (updatedSlot.femaleReservedCount > updatedSlot.femaleCapacity) {
            throw new ConflictException('Female capacity is already full.');
          }
        }

        const inspector =
          await this.moveOutRepository.findAvailableInspectorBySlotUuidInTx(
            user.email,
            inspectionSlotUuid,
            isMale ? Gender.MALE : Gender.FEMALE,
            tx,
          );

        const application =
          await this.moveOutRepository.createInspectionApplicationInTx(
            user.uuid,
            inspectionTargetInfo.uuid,
            inspectionSlotUuid,
            inspector.uuid,
            tx,
          );

        return { applicationUuid: application.uuid };
      },
    );
  }

  async updateInspection(
    user: User,
    applicationUuid: string,
    { inspectionSlotUuid }: UpdateInspectionDto,
  ): Promise<ApplicationUuidResDto> {
    return this.prismaService.$transaction(async (tx: PrismaTransaction) => {
      const application =
        await this.moveOutRepository.findApplicationByUuidWithXLockInTx(
          applicationUuid,
          tx,
        );

      if (application.userUuid !== user.uuid) {
        throw new ForbiddenException(
          'The application does not belong to this user.',
        );
      }

      if (application.inspectionSlotUuid === inspectionSlotUuid) {
        return { applicationUuid };
      }

      await this.moveOutRepository.deleteInspectionApplicationInTx(
        applicationUuid,
        tx,
      );

      const now = new Date();
      const timeDiff =
        application.inspectionSlot.startTime.getTime() - now.getTime();

      if (timeDiff < this.APPLICATION_UPDATE_DEADLINE) {
        throw new ForbiddenException(
          'Cannot modify the inspection time within 1 hour of the start time.',
        );
      }

      const isMale = this.extractGenderFromHouseName(
        application.inspectionTargetInfo.houseName,
      );

      await this.moveOutRepository.swapSlotReservedCountsInTx(
        application.inspectionSlotUuid,
        inspectionSlotUuid,
        isMale,
        tx,
      );

      const updatedSlot = await this.moveOutRepository.findSlotByUuidInTx(
        inspectionSlotUuid,
        tx,
      );

      if (
        application.inspectionSlot.scheduleUuid !== updatedSlot.scheduleUuid
      ) {
        throw new BadRequestException(
          'Changes are only possible within the same schedule.',
        );
      }

      if (isMale) {
        if (updatedSlot.maleReservedCount > updatedSlot.maleCapacity) {
          throw new ConflictException('Male capacity is already full.');
        }
      } else {
        if (updatedSlot.femaleReservedCount > updatedSlot.femaleCapacity) {
          throw new ConflictException('Female capacity is already full.');
        }
      }

      const inspector =
        await this.moveOutRepository.findAvailableInspectorBySlotUuidInTx(
          user.email,
          inspectionSlotUuid,
          isMale ? Gender.MALE : Gender.FEMALE,
          tx,
        );

      const updatedApplication =
        await this.moveOutRepository.createInspectionApplicationInTx(
          user.uuid,
          application.inspectionTargetInfoUuid,
          inspectionSlotUuid,
          inspector.uuid,
          tx,
        );

      return { applicationUuid: updatedApplication.uuid };
    });
  }

  async cancelInspection(user: User, applicationUuid: string): Promise<void> {
    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const application =
          await this.moveOutRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (application.userUuid !== user.uuid) {
          throw new ForbiddenException(
            'The application does not belong to this user.',
          );
        }

        const now = new Date();
        const timeDiff =
          application.inspectionSlot.startTime.getTime() - now.getTime();

        if (timeDiff >= this.APPLICATION_UPDATE_DEADLINE) {
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
    );
  }

  async findMyInspection(user: User): Promise<InspectionResDto> {
    const schedule = await this.moveOutRepository.findActiveSchedule();
    const application =
      await this.moveOutRepository.findApplicationByUserAndSchedule(
        user.uuid,
        schedule.uuid,
      );

    return {
      uuid: application.uuid,
      inspectionSlot: { ...application.inspectionSlot },
      isPassed: application.isPassed ?? undefined,
    };
  }

  async submitInspectionResult(
    { email, name, studentNumber }: User,
    applicationUuid: string,
    { passed, failed }: SubmitInspectionResultDto,
    inspectorSignature: Express.Multer.File | undefined,
    targetSignature: Express.Multer.File | undefined,
  ): Promise<void> {
    if (passed.length === 0 && failed.length === 0) {
      throw new BadRequestException(
        'At least one inspection item result (passed or failed) is required.',
      );
    }

    const overlap = passed.filter((slug) => failed.includes(slug));

    if (overlap.length > 0) {
      throw new BadRequestException(
        'Passed and failed items must not overlap.',
      );
    }

    const inspector = await this.inspectorService.findInspectorByUserInfo(
      email,
      name,
      studentNumber,
    );

    const inspectorSignatureImage = await this.validateSignatureFile(
      inspectorSignature,
      'inspector',
    );
    const targetSignatureImage = await this.validateSignatureFile(
      targetSignature,
      'target',
    );

    return await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const application =
          await this.moveOutRepository.findApplicationByUuidWithXLockInTx(
            applicationUuid,
            tx,
          );

        if (application.inspectorUuid !== inspector.uuid) {
          throw new ForbiddenException(
            'The inspector is not assigned to this application.',
          );
        }

        if (application.isPassed !== null) {
          throw new ConflictException(
            'Inspection result has already been submitted and cannot be modified.',
          );
        }

        await this.moveOutRepository.updateInspectionResultInTx(
          applicationUuid,
          { passed, failed },
          failed.length === 0,
          inspectorSignatureImage,
          targetSignatureImage,
          tx,
        );
      },
    );
  }

  private async validateSignatureFile(
    file: Express.Multer.File | undefined,
    role: 'inspector' | 'target',
  ): Promise<Uint8Array<ArrayBuffer>> {
    if (!file?.buffer || file.size === 0) {
      const subject =
        role === 'inspector' ? 'Inspector signature' : 'Target signature';
      throw new BadRequestException(`${subject} is required.`);
    }

    if (file.size > this.MAX_SIGNATURE_SIZE) {
      throw new BadRequestException(
        `Signature image size must be less than ${this.MAX_SIGNATURE_SIZE / 1024 / 1024}MB.`,
      );
    }

    const fileType = await fileTypeFromBuffer(file.buffer);
    const allowedMimeTypes = ['image/png', 'image/jpeg'];

    if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {
      throw new BadRequestException(
        `Invalid ${role} signature image type. Only PNG and JPEG are allowed.`,
      );
    }

    return new Uint8Array(file.buffer);
  }
}
