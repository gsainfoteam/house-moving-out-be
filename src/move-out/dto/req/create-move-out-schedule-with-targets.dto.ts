import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
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
  @Transform(({ value }: { value: unknown }) => {
    type RawInspectionTimeRange = { start: string; end: string };

    const toDateRange = (raw: RawInspectionTimeRange): InspectionTimeRange => ({
      start: new Date(raw.start),
      end: new Date(raw.end),
    });

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as
          | RawInspectionTimeRange
          | RawInspectionTimeRange[]
          | null;
        if (!parsed) {
          return [];
        }
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return arr.map((raw) => toDateRange(raw));
      } catch {
        return [];
      }
    }

    if (Array.isArray(value)) {
      return (value as RawInspectionTimeRange[]).map((raw) => toDateRange(raw));
    }

    if (value && typeof value === 'object') {
      const raw = value as RawInspectionTimeRange;
      return [toDateRange(raw)];
    }

    return [];
  })
  @Type(() => InspectionTimeRange)
  @IsArray()
  inspectionTimeRange: InspectionTimeRange[];

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Inspection targets Excel file (.xlsx)',
  })
  @IsOptional()
  file?: Express.Multer.File;
}
