import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { MoveOutRepository } from './move-out.repository';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import { MoveOutSchedule, Season, Semester } from 'generated/prisma/client';
import { MoveOutScheduleDates } from './types/moveOutScheduleDates.type';
import { UpdateMoveOutScheduleDto } from './dto/req/updateMoveOutSchedule.dto';
import { SemesterDto } from './dto/req/semester.dto';
import { Loggable } from '@lib/logger';
import * as ExcelJS from 'exceljs';
import { fileTypeFromBuffer } from 'file-type';
import AdmZip from 'adm-zip';
import {
  ParsedExcelSet,
  ParsedExcelRow,
  InfoGroup,
  RoomInfo,
  InspectionTargetStudent,
} from './types/excel.type';
import {
  EXCEL_PARSING_CONSTANTS,
  EXCEL_VALIDATION_CONSTANTS,
} from './types/excel.constants';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class MoveOutService {
  constructor(
    private readonly moveOutRepository: MoveOutRepository,
    private readonly prismaService: PrismaService,
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

    await this.validateExcelFile(file);

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
      this.parseSheetToRoomInfoMap(currentSemesterSheet);
    const nextSemesterRooms = this.parseSheetToRoomInfoMap(nextSemesterSheet);

    const inspectionTargets = this.findInspectionTargetRooms(
      currentSemesterRooms,
      nextSemesterRooms,
    );

    const currentSemester = await this.findOrCreateSemester(
      currentSemesterDto.year,
      currentSemesterDto.season,
    );
    const nextSemester = await this.findOrCreateSemester(
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

  private parseSheetToRoomInfoMap(
    worksheet: ExcelJS.Worksheet,
  ): Map<string, RoomInfo> {
    const roomMap = new Map<string, RoomInfo>();
    const dataSections: ParsedExcelSet[] = [];
    let currentSectionStartRow = 1;

    for (
      let rowIndex = 0;
      rowIndex < EXCEL_PARSING_CONSTANTS.ROW_SETS;
      rowIndex++
    ) {
      const sectionStartRow = currentSectionStartRow;
      const sectionEndRow = this.findDataSectionEndRow(
        worksheet,
        sectionStartRow,
      );
      let currentCol = 1;

      for (
        let columnIndex = 0;
        columnIndex < EXCEL_PARSING_CONSTANTS.COLUMN_SETS;
        columnIndex++
      ) {
        const isExtended =
          (rowIndex === 0 || rowIndex === 1) && columnIndex >= 2;
        const batchCols = isExtended
          ? EXCEL_PARSING_CONSTANTS.BATCH_COLS_EXTENDED
          : EXCEL_PARSING_CONSTANTS.BATCH_COLS_NORMAL;

        const houseName = this.getCellValue(
          worksheet.getRow(sectionStartRow).getCell(currentCol),
        );

        if (!houseName) {
          const columnGap = this.calculateColumnGapToNextSection(
            worksheet,
            sectionStartRow,
            currentCol,
            batchCols,
          );
          currentCol += batchCols + columnGap;
          continue;
        }

        const headerRow = worksheet.getRow(sectionStartRow + 1);
        const rowTitleHeader = this.getCellValue(headerRow.getCell(currentCol));
        const studentHeaderGroups = this.extractStudentHeaderGroups(
          headerRow,
          currentCol,
          batchCols,
        );
        const sectionData = this.parseDataRowsInSection(
          worksheet,
          sectionStartRow,
          sectionEndRow,
          currentCol,
          rowTitleHeader,
          studentHeaderGroups,
        );

        if (sectionData.length > 0) {
          dataSections.push({ houseName, data: sectionData });
        }

        const columnGap = this.calculateColumnGapToNextSection(
          worksheet,
          sectionStartRow,
          currentCol,
          batchCols,
        );
        currentCol += batchCols + columnGap;
      }

      const nextSectionStart = this.findNextDataSectionStartRow(
        worksheet,
        sectionEndRow,
      );
      if (!nextSectionStart) {
        break;
      }
      currentSectionStartRow = nextSectionStart;
    }

    for (const section of dataSections) {
      for (const row of section.data) {
        if (!row.room) {
          continue;
        }

        const roomKey = `${section.houseName}|${row.room}`;
        const students: Array<{ name?: string; studentNumber?: string }> = [];

        if (row.student1?.name || row.student1?.studentNumber) {
          students.push({
            name: row.student1.name,
            studentNumber: row.student1.studentNumber,
          });
        }
        if (row.student2?.name || row.student2?.studentNumber) {
          students.push({
            name: row.student2.name,
            studentNumber: row.student2.studentNumber,
          });
        }
        if (row.student3?.name || row.student3?.studentNumber) {
          students.push({
            name: row.student3.name,
            studentNumber: row.student3.studentNumber,
          });
        }

        roomMap.set(roomKey, {
          houseName: section.houseName,
          roomNumber: row.room,
          students,
        });
      }
    }

    return roomMap;
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

  private getCellValue(cell: ExcelJS.Cell): string {
    const cellValue = cell.value;
    if (cellValue === null || cellValue === undefined) {
      return '';
    }
    if (typeof cellValue === 'string') {
      return cellValue.trim();
    }
    if (typeof cellValue === 'number' || typeof cellValue === 'boolean') {
      return String(cellValue).trim();
    }
    return '';
  }

  private findDataSectionEndRow(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
  ): number {
    const totalRows = worksheet.rowCount;
    let lastDataRow = startRow + 1;

    for (let rowNum = startRow + 2; rowNum <= totalRows; rowNum++) {
      const row = worksheet.getRow(rowNum);
      let hasData = false;

      for (let col = 1; col <= worksheet.columnCount; col++) {
        if (this.getCellValue(row.getCell(col))) {
          hasData = true;
          break;
        }
      }

      if (hasData) {
        lastDataRow = rowNum;
      } else {
        return lastDataRow;
      }
    }

    return lastDataRow;
  }

  private extractStudentHeaderGroups(
    headerRow: ExcelJS.Row,
    currentCol: number,
    batchCols: number,
  ): InfoGroup[] {
    const infoGroups: InfoGroup[] = [];
    let groupIndex = 1;

    for (let col = currentCol + 1; col < currentCol + batchCols; col += 2) {
      const header1 = this.getCellValue(headerRow.getCell(col));
      const header2 = this.getCellValue(headerRow.getCell(col + 1));
      if (header1 || header2) {
        infoGroups.push({
          name: `student${groupIndex}`,
          headers: {
            col1: header1,
            col2: header2,
          },
        });
        groupIndex++;
      }
    }

    return infoGroups;
  }

  private parseDataRowsInSection(
    worksheet: ExcelJS.Worksheet,
    sectionStartRow: number,
    sectionEndRow: number,
    currentCol: number,
    rowTitleHeader: string,
    studentHeaderGroups: InfoGroup[],
  ): ParsedExcelRow[] {
    const sectionData: ParsedExcelRow[] = [];
    const totalRows = worksheet.rowCount;
    let skipMode = false;

    for (
      let rowNum = sectionStartRow + 2;
      rowNum <= sectionEndRow && rowNum <= totalRows;
      rowNum++
    ) {
      const row = worksheet.getRow(rowNum);

      if (this.isSectionSeparatorRow(row, currentCol, worksheet)) {
        skipMode = !skipMode;
        continue;
      }

      if (skipMode) {
        continue;
      }

      const rowData = this.extractSingleRowData(
        row,
        currentCol,
        rowTitleHeader,
        studentHeaderGroups,
      );

      if (this.hasNonEmptyData(rowData)) {
        sectionData.push(rowData);
      }
    }

    return sectionData;
  }

  private isSectionSeparatorRow(
    row: ExcelJS.Row,
    currentCol: number,
    worksheet: ExcelJS.Worksheet,
  ): boolean {
    for (
      let col = currentCol;
      col < currentCol + EXCEL_PARSING_CONSTANTS.QUOTE_CHECK_COLS &&
      col <= worksheet.columnCount;
      col++
    ) {
      if (this.getCellValue(row.getCell(col)) !== '"') {
        return false;
      }
    }
    return true;
  }

  private extractSingleRowData(
    row: ExcelJS.Row,
    currentCol: number,
    rowTitleHeader: string,
    studentHeaderGroups: InfoGroup[],
  ): ParsedExcelRow {
    const rowData: ParsedExcelRow = {};

    if (rowTitleHeader) {
      rowData.room = this.getCellValue(row.getCell(currentCol));
    }

    const col2Value = this.getCellValue(row.getCell(currentCol + 1));
    const col3Value = this.getCellValue(row.getCell(currentCol + 2));
    const col4Value = this.getCellValue(row.getCell(currentCol + 3));
    const col5Value = this.getCellValue(row.getCell(currentCol + 4));
    const isSpecialCase = col2Value && !col3Value && !col4Value && !col5Value;

    let colOffset = 1;

    for (
      let groupIndex = 0;
      groupIndex < studentHeaderGroups.length;
      groupIndex++
    ) {
      const studentGroup = studentHeaderGroups[groupIndex];
      const col1 = currentCol + colOffset;
      const col2 = currentCol + colOffset + 1;
      const value1 = this.getCellValue(row.getCell(col1));
      const value2 = this.getCellValue(row.getCell(col2));

      if (isSpecialCase && groupIndex === 0) {
        rowData.info = value1;
        break;
      } else {
        const isInfo3 = groupIndex === 2;
        if (!isInfo3 || value1 || value2) {
          (rowData as Record<string, unknown>)[studentGroup.name] = {
            name: value1,
            studentNumber: value2,
          };
        }
      }

      colOffset += 2;
    }

    return rowData;
  }

  private hasNonEmptyData(obj: Record<string, unknown>): boolean {
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        if (this.hasNonEmptyData(value as Record<string, unknown>)) {
          return true;
        }
      } else if (value !== null && value !== undefined && value !== '') {
        return true;
      }
    }
    return false;
  }

  private calculateColumnGapToNextSection(
    worksheet: ExcelJS.Worksheet,
    sectionStartRow: number,
    currentCol: number,
    batchCols: number,
  ): number {
    for (
      let checkCol = currentCol + batchCols + 1;
      checkCol <= currentCol + batchCols + 3;
      checkCol++
    ) {
      const checkCell = this.getCellValue(
        worksheet.getRow(sectionStartRow).getCell(checkCol),
      );
      if (checkCell) {
        return checkCol - (currentCol + batchCols);
      }
    }
    return EXCEL_PARSING_CONSTANTS.SEPARATOR_COLS;
  }

  private findNextDataSectionStartRow(
    worksheet: ExcelJS.Worksheet,
    sectionEndRow: number,
  ): number | null {
    const totalRows = worksheet.rowCount;
    let nextSectionStart = sectionEndRow + 1;

    while (nextSectionStart <= totalRows) {
      const firstCell = this.getCellValue(
        worksheet.getRow(nextSectionStart).getCell(1),
      );
      if (firstCell) {
        return nextSectionStart;
      }
      nextSectionStart++;
      if (
        nextSectionStart >
        sectionEndRow + EXCEL_PARSING_CONSTANTS.MAX_SEARCH_ROWS
      ) {
        break;
      }
    }

    return null;
  }

  private async validateExcelFile(
    file: Express.Multer.File | undefined,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException('File is not uploaded');
    }

    if (!file.originalname) {
      throw new BadRequestException('File name is missing');
    }

    const lastDotIndex = file.originalname.lastIndexOf('.');
    if (lastDotIndex === -1) {
      throw new BadRequestException('File extension is missing');
    }

    const fileExtension = file.originalname
      .toLowerCase()
      .substring(lastDotIndex);

    if (
      !(
        EXCEL_VALIDATION_CONSTANTS.ALLOWED_EXTENSIONS as readonly string[]
      ).includes(fileExtension)
    ) {
      throw new BadRequestException(
        `Invalid file format. Allowed formats: ${EXCEL_VALIDATION_CONSTANTS.ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    if (
      !file.mimetype ||
      !(
        EXCEL_VALIDATION_CONSTANTS.ALLOWED_MIME_TYPES as readonly string[]
      ).includes(file.mimetype)
    ) {
      throw new BadRequestException('Invalid MIME type');
    }

    if (file.size === 0) {
      throw new BadRequestException('Empty file cannot be uploaded');
    }

    if (file.size > EXCEL_VALIDATION_CONSTANTS.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size is too large. Maximum size: ${EXCEL_VALIDATION_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    const detectedFileType = await fileTypeFromBuffer(file.buffer);

    if (!detectedFileType) {
      throw new BadRequestException(
        'Unable to detect file type from file signature',
      );
    }

    const isAllowedMimeType =
      EXCEL_VALIDATION_CONSTANTS.ALLOWED_MIME_TYPES.some(
        (allowedType) => allowedType === detectedFileType.mime,
      );

    if (!isAllowedMimeType) {
      throw new BadRequestException(
        'File signature does not match Excel file format',
      );
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(file.buffer);
    } catch {
      throw new BadRequestException(
        'File is not a valid ZIP archive (xlsx files are ZIP-based)',
      );
    }

    const entries = zip.getEntries();
    const entryNames = entries.map((entry) => entry.entryName);

    const required = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml'];

    const normalized = new Set(entryNames.map((n) => n.replace(/\\/g, '/')));

    for (const r of required) {
      if (!normalized.has(r)) {
        throw new BadRequestException('Invalid XLSX structure');
      }
    }
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

  private async findOrCreateSemester(
    year: number,
    season: Season,
  ): Promise<Semester> {
    return await this.moveOutRepository.findOrCreateSemester(year, season);
  }
}
