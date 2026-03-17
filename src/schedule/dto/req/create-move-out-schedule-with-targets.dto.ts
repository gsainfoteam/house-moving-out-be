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
import { Season } from 'generated/prisma/client';

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
    description: 'Actual operation time range list',
    example: [
      {
        start: '2026-01-22T03:00:00.000Z',
        end: '2026-01-22T06:00:00.000Z',
      },
      {
        start: '2026-01-23T03:00:00.000Z',
        end: '2026-01-23T06:00:00.000Z',
      },
      {
        start: '2026-01-24T03:00:00.000Z',
        end: '2026-01-24T10:00:00.000Z',
      },
      {
        start: '2026-01-25T03:00:00.000Z',
        end: '2026-01-25T08:30:00.000Z',
      },
    ],
  })
  @Transform(({ value }) => {
    if (value == null || value === '') {
      return [];
    }

    let parsed: unknown;

    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return [];
      }
    } else {
      parsed = value;
    }

    const arr = Array.isArray(parsed) ? parsed : [parsed];

    return plainToInstance(InspectionTimeRange, arr);
  })
  @Type(() => InspectionTimeRange)
  @ValidateNested({ each: true })
  @IsArray()
  inspectionTimeRange: InspectionTimeRange[];

  @ApiProperty({
    description: 'Resident gender map per house+floor key',
    type: 'object',
    additionalProperties: {
      type: 'string',
      enum: ['male', 'female'],
    },
    example: {
      G1: 'male',
      G2: 'male',
      G3: 'male',
      G4: 'male',
      G5: 'female',
      G6: 'female',
    },
  })
  @Transform(({ value }) => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        const result: Record<string, 'male' | 'female'> = {};
        for (const [key, v] of Object.entries(parsed)) {
          if (v === 'male' || v === 'female') {
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
      const result: Record<string, 'male' | 'female'> = {};
      for (const [key, v] of Object.entries(record)) {
        if (v === 'male' || v === 'female') {
          result[key] = v;
        }
      }
      return result;
    }
    return {};
  })
  @IsObject()
  residentGenderByHouseFloorKey: Record<string, 'male' | 'female'>;
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
