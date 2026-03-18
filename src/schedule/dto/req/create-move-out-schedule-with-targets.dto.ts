import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Gender, Season } from 'generated/prisma/client';

export class InspectionTimeRange {
  @ApiProperty({
    description: 'Operation time range start',
    example: '2026-01-22T03:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  start: Date;

  @ApiProperty({
    description: 'Operation time range end',
    example: '2026-01-22T06:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  end: Date;
}

export class CreateMoveOutScheduleWithTargetsDto {
  @ApiProperty({
    example: '2025 Fall Semester Regular Move Out Inspection',
    description: 'Move out inspection schedule title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: '2025-11-30T15:00:00.000Z',
    description: 'Application start time',
  })
  @Type(() => Date)
  @IsDate()
  applicationStartTime: Date;

  @ApiProperty({
    example: '2025-12-04T15:00:00.000Z',
    description: 'Application end time',
  })
  @Type(() => Date)
  @IsDate()
  applicationEndTime: Date;

  @ApiProperty({
    example: 2025,
    description: 'Current semester year',
  })
  @Type(() => Number)
  @IsInt()
  currentYear: number;

  @ApiProperty({
    example: Season.SPRING,
    description: 'Current semester season',
    enum: Season,
  })
  @IsEnum(Season)
  currentSeason: Season;

  @ApiProperty({
    example: 2025,
    description: 'Next semester year',
  })
  @Type(() => Number)
  @IsInt()
  nextYear: number;

  @ApiProperty({
    example: Season.SUMMER,
    description: 'Next semester season',
    enum: Season,
  })
  @IsEnum(Season)
  nextSeason: Season;

  @ApiProperty({
    type: [InspectionTimeRange],
    description: 'Actual inspection slot list (each item is a single slot)',
    example: [
      {
        start: '2026-01-22T03:00:00.000Z',
        end: '2026-01-22T03:40:00.000Z',
      },
      {
        start: '2026-01-22T03:40:00.000Z',
        end: '2026-01-22T04:00:00.000Z',
      },
      {
        start: '2026-01-22T04:00:00.000Z',
        end: '2026-01-22T04:30:00.000Z',
      },
    ],
  })
  @Transform(({ value }) => {
    if (value == null || value === '') {
      return [];
    }

    const items = Array.isArray(value) ? value : [value];
    const parsed = items
      .flatMap((item): unknown[] => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          try {
            const p: unknown = JSON.parse(trimmed);
            return Array.isArray(p) ? p : [p];
          } catch {
            try {
              const wrapped = trimmed.startsWith('[')
                ? trimmed
                : `[${trimmed}]`;
              const p: unknown = JSON.parse(wrapped);
              return Array.isArray(p) ? p : [p];
            } catch {
              return [];
            }
          }
        }
        return [item];
      })
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object',
      );

    return plainToInstance(InspectionTimeRange, parsed);
  })
  @IsArray()
  @Type(() => InspectionTimeRange)
  @ValidateNested({ each: true })
  inspectionTimeRange: InspectionTimeRange[];

  @ApiProperty({
    description: 'Resident gender map per house+floor key',
    type: 'object',
    additionalProperties: {
      type: 'string',
      enum: [Gender.MALE, Gender.FEMALE],
    },
    example: {
      G1: Gender.MALE,
      G2: Gender.MALE,
      G3: Gender.MALE,
      G4: Gender.MALE,
      G5: Gender.FEMALE,
      G6: Gender.FEMALE,
    },
  })
  @Transform(({ value }) => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        const result: Record<string, Gender> = {};
        for (const [key, v] of Object.entries(parsed)) {
          if (v === Gender.MALE || v === Gender.FEMALE) {
            result[key] = v;
          }
        }
        return result;
      } catch {
        return {};
      }
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const result: Record<string, Gender> = {};
      for (const [key, v] of Object.entries(record)) {
        if (v === Gender.MALE || v === Gender.FEMALE) {
          result[key] = v;
        }
      }
      return result;
    }
    return {};
  })
  @IsObject()
  residentGenderByHouseFloorKey: Record<string, Gender>;
}

export class CreateMoveOutScheduleWithTargetsFormDto extends CreateMoveOutScheduleWithTargetsDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Current semester resident Excel file (.xlsx)',
  })
  currentSemesterFile: Express.Multer.File;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Next semester resident Excel file (.xlsx)',
  })
  nextSemesterFile: Express.Multer.File;
}
