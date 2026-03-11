import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { RoomInfo } from './types/room-assignment.type';

@Injectable()
export class ExcelParserService {
  parseSheetToRoomInfoMap(
    worksheet: ExcelJS.Worksheet,
    residentGenderByHouseFloorKey: Record<string, 'male' | 'female'>,
  ): Map<string, RoomInfo> {
    if (!worksheet.rowCount) {
      return new Map<string, RoomInfo>();
    }

    const roomMap = new Map<string, RoomInfo>();
    const firstDataRow = 2;

    for (let rowNum = firstDataRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      const buildingName = this.getCellValue(row.getCell(1));
      const roomNumber = this.getCellValue(row.getCell(2));
      const roomCapacity = this.getCellValue(row.getCell(3));
      const limitType = this.getCellValue(row.getCell(9));

      if (buildingName.startsWith('C동')) {
        break;
      }

      if (!buildingName && !roomNumber) {
        continue;
      }

      const roomMatch = roomNumber.match(/^([A-Za-z])(\d)/);
      const houseGenderKey =
        roomMatch && roomMatch[1] && roomMatch[2]
          ? `${roomMatch[1].toUpperCase()}${roomMatch[2]}`
          : roomNumber;

      const houseGender = residentGenderByHouseFloorKey[houseGenderKey];
      if (!houseGender) {
        continue;
      }

      const genderKor = houseGender === 'male' ? '남' : '여';

      const houseName =
        roomNumber.length > 0
          ? `${roomNumber[0]}하우스 (${genderKor})`
          : roomNumber;

      const students: Array<{ name?: string; admissionYear?: string }> = [];

      const residentCols = [5, 6, 7];
      for (const col of residentCols) {
        const value = this.getCellValue(row.getCell(col));
        if (!value) {
          continue;
        }

        const parsed = this.parseStudentCell(value);
        if (parsed) {
          students.push(parsed);
        }
      }

      const roomKey = `${houseName}|${roomNumber}`;

      roomMap.set(roomKey, {
        houseName,
        roomNumber,
        roomCapacity: Number(roomCapacity[0]),
        limitType,
        students,
      });
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

    if (typeof cellValue === 'object') {
      const v = cellValue as {
        text?: unknown;
        richText?: Array<{ text?: unknown }>;
        result?: unknown;
      };

      if (typeof v.text === 'string') {
        return v.text.trim();
      }

      if (Array.isArray(v.richText)) {
        const joined = v.richText
          .map((r) => (typeof r.text === 'string' ? r.text : ''))
          .join('');
        return joined.trim();
      }

      if (
        typeof v.result === 'string' ||
        typeof v.result === 'number' ||
        typeof v.result === 'boolean'
      ) {
        return String(v.result).trim();
      }
    }

    return '';
  }

  private parseStudentCell(
    value: string,
  ): { name: string; admissionYear: string } | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const idMatch = trimmed.match(/(\d{8})/);
    if (!idMatch) {
      return null;
    }
    const studentNumber = idMatch[1];
    const admissionYear = studentNumber;

    const namePart = trimmed.replace(studentNumber, '').replace(/[()\s]/g, '');
    const name = namePart || trimmed;

    return {
      name,
      admissionYear,
    };
  }
}
