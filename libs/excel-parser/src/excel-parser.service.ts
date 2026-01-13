import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ParsedExcelSet,
  ParsedExcelRow,
  InfoGroup,
  RoomInfo,
} from './types/room-assignment.type';
import { EXCEL_PARSING_CONSTANTS } from './constants/room-assignment-parser.constants';

@Injectable()
export class ExcelParserService {
  parseSheetToRoomInfoMap(worksheet: ExcelJS.Worksheet): Map<string, RoomInfo> {
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
}
