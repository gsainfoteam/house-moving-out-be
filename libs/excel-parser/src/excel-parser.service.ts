import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { RoomInfo } from './types/room-assignment.type';
import {
  HOUSE_GENDER_KEYS,
  HouseGenderKey,
} from './constants/room-assignment-parser.constants';
import { Gender } from 'generated/prisma/client';

@Injectable()
export class ExcelParserService {
  parseSheetToRoomInfoMap(
    worksheet: ExcelJS.Worksheet,
    residentGenderByHouseFloorKey: Record<string, Gender>,
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
      if (!roomMatch) {
        throw new BadRequestException(
          `Invalid room number format. roomNumber=${roomNumber}`,
        );
      }
      const houseGenderKey = `${roomMatch[1].toUpperCase()}${roomMatch[2]}`;

      if (!HOUSE_GENDER_KEYS.includes(houseGenderKey as HouseGenderKey)) {
        throw new BadRequestException(
          `Invalid house gender key. roomNumber=${roomNumber}, key=${houseGenderKey}`,
        );
      }
      const houseGender = residentGenderByHouseFloorKey[houseGenderKey];
      if (!houseGender) {
        throw new BadRequestException(
          `Missing gender mapping for key. roomNumber=${roomNumber}, key=${houseGenderKey}`,
        );
      }

      const houseName = roomNumber.length > 0 ? roomNumber[0] : roomNumber;

      const students: Array<{ name?: string; studentNumber?: string }> = [];

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
        gender: houseGender,
        roomNumber,
        roomCapacity: this.parseRoomCapacity(roomCapacity),
        limitType,
        students,
      });
    }

    return roomMap;
  }

  private parseRoomCapacity(value: string): number {
    if (!value) {
      return Number.NaN;
    }

    const firstDigitMatch = value.match(/\d/);
    if (!firstDigitMatch) {
      return Number.NaN;
    }

    return Number.parseInt(firstDigitMatch[0], 10);
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
  ): { name: string; studentNumber: string } | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const idMatch = trimmed.match(/(\d{8})/);
    if (!idMatch) {
      return null;
    }
    const studentNumber = idMatch[1];

    const namePart = trimmed.replace(studentNumber, '').replace(/[()\s]/g, '');
    if (!namePart) {
      throw new BadRequestException(
        `Invalid student cell value (missing name). value=${trimmed}`,
      );
    }
    const name = namePart;

    return {
      name,
      studentNumber,
    };
  }
}
