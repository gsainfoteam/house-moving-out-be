import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { MoveOutRepository } from './move-out.repository';
import { MoveOutSchedule, Season } from 'generated/prisma/client';
import { MoveOutScheduleDates } from './types/move-out-schedule-dates.type';
import { UpdateMoveOutScheduleDto } from './dto/req/update-move-out-schedule.dto';
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

@Loggable()
@Injectable()
export class MoveOutService {
  private readonly SLOT_DURATION_MINUTES = 30;
  private readonly WEIGHT_FACTOR = 1.5;
  constructor(
    private readonly moveOutRepository: MoveOutRepository,
    private readonly prismaService: PrismaService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
  ) {}

  async createMoveOutSchedule(
    createMoveOutScheduleDto: CreateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    // this.validateScheduleDates(createMoveOutScheduleDto);
    const targetCounts = this.calculateTargetCounts();

    const { inspectionTimeRange, ...scheduleData } = createMoveOutScheduleDto;
    const generatedSlots = this.generateSlots(
      inspectionTimeRange,
      this.SLOT_DURATION_MINUTES,
    );
    if (generatedSlots.length === 0) {
      throw new BadRequestException(
        'No slots were generated. Check your inspection time ranges.',
      );
    }

    const maxCapacity = this.calculateMaxCapacity(
      generatedSlots.length,
      targetCounts,
      this.WEIGHT_FACTOR,
    );

    const slotsData = generatedSlots.map((slot) => ({
      ...slot,
      maxCapacity,
    }));

    return await this.moveOutRepository.createMoveOutSchedule(
      scheduleData,
      slotsData,
    );
  }

  async updateMoveOutSchedule(
    id: number,
    updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    const schedule =
      await this.moveOutRepository.findMoveOutScheduleWithSlotsById(id);

    const updatedMoveOutScheduleDates: MoveOutScheduleDates = {
      ...schedule,
      ...updateMoveOutScheduleDto,
    };

    this.validateScheduleDates(updatedMoveOutScheduleDates);

    return await this.moveOutRepository.updateMoveOutSchedule(
      id,
      updateMoveOutScheduleDto,
    );
  }

  async findMoveOutScheduleWithSlots(
    id: number,
  ): Promise<MoveOutScheduleWithSlots> {
    return await this.moveOutRepository.findMoveOutScheduleWithSlotsById(id);
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
        const existingTarget =
          await this.moveOutRepository.findFirstInspectionTargetBySemestersInTx(
            currentSemesterEntity.uuid,
            nextSemesterEntity.uuid,
            tx,
          );

        if (existingTarget !== null) {
          throw new ConflictException(
            `Inspection targets already exist for current semester (${currentSemester.year} ${currentSemester.season}) and next semester (${nextSemester.year} ${nextSemester.season}). Use update endpoint to modify existing data.`,
          );
        }

        return await this.moveOutRepository.createInspectionTargetsInTx(
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
          !currentSemesterStudent.studentNumber
        ) {
          continue;
        }

        if (!nextSemesterRoom || nextSemesterRoom.students.length === 0) {
          inspectionTargets.push({
            houseName: currentSemesterRoom.houseName,
            roomNumber: currentSemesterRoom.roomNumber,
            studentName: currentSemesterStudent.name,
            studentNumber: currentSemesterStudent.studentNumber,
          });
          continue;
        }

        const studentStillInRoom = nextSemesterRoom.students.some(
          (nextSemesterStudent) =>
            currentSemesterStudent.name === nextSemesterStudent.name &&
            currentSemesterStudent.studentNumber ===
              nextSemesterStudent.studentNumber,
        );

        if (!studentStillInRoom) {
          inspectionTargets.push({
            houseName: currentSemesterRoom.houseName,
            roomNumber: currentSemesterRoom.roomNumber,
            studentName: currentSemesterStudent.name,
            studentNumber: currentSemesterStudent.studentNumber,
          });
        }
      }
    }

    return inspectionTargets;
  }

  private calculateTargetCounts(): InspectionTargetCount {
    // Mocking 함수.
    return { male: 150, female: 150 };
  }

  private generateSlots(
    inspectionTimeRanges: InspectionTimeRangeDto[],
    slotDuration: number,
  ): { startTime: Date; endTime: Date }[] {
    const slots: { startTime: Date; endTime: Date }[] = [];
    for (const range of inspectionTimeRanges) {
      let timePointer = new Date(range.start);
      const end = new Date(range.end);

      while (true) {
        const nextTime = new Date(timePointer.getTime() + slotDuration * 60000);
        if (nextTime > end) {
          break;
        }

        slots.push({
          startTime: timePointer,
          endTime: nextTime,
        });

        timePointer = nextTime;
      }
    }
    return slots;
  }

  private calculateMaxCapacity(
    totalSlots: number,
    targetCounts: InspectionTargetCount,
    weightFactor: number,
  ): number {
    const weightedTotalCount =
      (targetCounts.male + targetCounts.female) * weightFactor;
    return Math.ceil(weightedTotalCount / totalSlots);
  }

  private validateScheduleDates(
    moveOutScheduleDates: MoveOutScheduleDates,
  ): void {
    const {
      applicationStartDate,
      applicationEndDate,
      inspectionStartDate,
      inspectionEndDate,
    } = moveOutScheduleDates;

    if (applicationStartDate > applicationEndDate) {
      throw new BadRequestException(
        'Application start date cannot be after application end date',
      );
    }

    if (inspectionStartDate > inspectionEndDate) {
      throw new BadRequestException(
        'Inspection start date cannot be after inspection end date',
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
