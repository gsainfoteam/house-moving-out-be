import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { MoveOutRepository } from './move-out.repository';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import { MoveOutSchedule, Season } from 'generated/prisma/client';
import { MoveOutScheduleDates } from './types/moveOutScheduleDates.type';
import { UpdateMoveOutScheduleDto } from './dto/req/updateMoveOutSchedule.dto';
import { SemesterDto } from './dto/req/semester.dto';
import { Loggable } from '@lib/logger';
import * as ExcelJS from 'exceljs';
import {
  RoomInfo,
  ExcelParserService,
  ExcelValidatorService,
} from '@lib/excel-parser';
import { InspectionTargetStudent } from './types/inspectionTarget.type';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class MoveOutService {
  constructor(
    private readonly moveOutRepository: MoveOutRepository,
    private readonly prismaService: PrismaService,
    private readonly excelParserService: ExcelParserService,
    private readonly excelValidatorService: ExcelValidatorService,
  ) {}

  async createMoveOutSchedule(
    createMoveOutScheduleDto: CreateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    this.validateScheduleDates(createMoveOutScheduleDto);

    return await this.moveOutRepository.createMoveOutSchedule(
      createMoveOutScheduleDto,
    );
  }

  async updateMoveOutSchedule(
    id: number,
    updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    const schedule = await this.moveOutRepository.findMoveOutScheduleById(id);

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

  async compareTwoSheetsAndFindInspectionTargets(
    file: Express.Multer.File | undefined,
    currentSemesterDto: SemesterDto,
    nextSemesterDto: SemesterDto,
  ): Promise<number> {
    this.validateSemesterOrder(currentSemesterDto, nextSemesterDto);

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

    const currentSemester = await this.moveOutRepository.findOrCreateSemester(
      currentSemesterDto.year,
      currentSemesterDto.season,
    );
    const nextSemester = await this.moveOutRepository.findOrCreateSemester(
      nextSemesterDto.year,
      nextSemesterDto.season,
    );

    const result = await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const existingTarget =
          await this.moveOutRepository.findFirstInspectionTargetBySemestersInTx(
            currentSemester.uuid,
            nextSemester.uuid,
            tx,
          );

        if (existingTarget !== null) {
          throw new ConflictException(
            `Inspection targets already exist for current semester (${currentSemesterDto.year} ${currentSemesterDto.season}) and next semester (${nextSemesterDto.year} ${nextSemesterDto.season}). Use update endpoint to modify existing data.`,
          );
        }

        return await this.moveOutRepository.createInspectionTargetsInTx(
          currentSemester.uuid,
          nextSemester.uuid,
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

  private validateScheduleDates(moveOutScheduleDates: MoveOutScheduleDates) {
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
    currentSemesterDto: SemesterDto,
    nextSemesterDto: SemesterDto,
  ): void {
    const { year: currentYear, season: currentSeason } = currentSemesterDto;
    const { year: nextYear, season: nextSeason } = nextSemesterDto;

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
