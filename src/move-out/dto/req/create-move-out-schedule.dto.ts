import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, IsArray, ValidateNested } from 'class-validator';

export class InspectionTimeRangeDto {
  @ApiProperty({
    description: '운영 시간 범위 시작',
    example: '2026-01-13T04:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  start: Date;

  @ApiProperty({
    description: '운영 시간 범위 종료',
    example: '2026-01-13T10:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  end: Date;
}

export class CreateMoveOutScheduleDto {
  @ApiProperty({
    example: '2025 가을학기 정규 퇴사검사',
    description: '퇴사 검사 일정 제목',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: '2025-11-30T15:00:00.000Z',
    description: '신청 시작 날짜',
  })
  @Type(() => Date)
  @IsDate()
  applicationStartDate: Date;

  @ApiProperty({
    example: '2025-12-04T15:00:00.000Z',
    description: '신청 종료 날짜',
  })
  @Type(() => Date)
  @IsDate()
  applicationEndDate: Date;

  @ApiProperty({
    example: '2025-12-09T15:00:00.000Z',
    description: '검사 시작 날짜',
  })
  @Type(() => Date)
  @IsDate()
  inspectionStartDate: Date;

  @ApiProperty({
    example: '2025-12-14T15:00:00.000Z',
    description: '검사 종료 날짜',
  })
  @Type(() => Date)
  @IsDate()
  inspectionEndDate: Date;

  @ApiProperty({
    type: [InspectionTimeRangeDto],
    description: '실제 운영 시간 범위 목록',
    example: [
      { start: '2026-01-13T04:00:00.000Z', end: '2026-01-13T06:30:00.000Z' },
      { start: '2026-01-14T00:00:00.000Z', end: '2026-01-14T03:15:00.000Z' },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => InspectionTimeRangeDto)
  @IsArray()
  inspectionTimeRange: InspectionTimeRangeDto[];
}
