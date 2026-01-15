import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, IsArray, ValidateNested } from 'class-validator';

export class InspectionTimeRangeDto {
  @ApiProperty({
    description: '운영 시간 범위 시작',
    example: '2026-01-13T13:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  start: Date;

  @ApiProperty({
    description: '운영 시간 범위 종료',
    example: '2025-01-13T19:00:00.000Z',
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
    example: '2025-12-01',
    description: '신청 시작 날짜',
  })
  @Type(() => Date)
  @IsDate()
  applicationStartDate: Date;

  @ApiProperty({
    example: '2025-12-05',
    description: '신청 종료 날짜',
  })
  @Type(() => Date)
  @IsDate()
  applicationEndDate: Date;

  @ApiProperty({
    example: '2025-12-10',
    description: '검사 시작 날짜',
  })
  @Type(() => Date)
  @IsDate()
  inspectionStartDate: Date;

  @ApiProperty({
    example: '2025-12-15',
    description: '검사 종료 날짜',
  })
  @Type(() => Date)
  @IsDate()
  inspectionEndDate: Date;

  @ApiProperty({
    type: [InspectionTimeRangeDto],
    description: '실제 운영 시간 범위 목록',
    example: [
      { start: '2026-01-13T13:00:00.000Z', end: '2025-06-19T15:30:00.000Z' },
      { start: '2026-01-14T09:00:00.000Z', end: '2025-06-20T12:15:00.000Z' },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => InspectionTimeRangeDto)
  @IsArray()
  inspectionTimeRange: InspectionTimeRangeDto[];
}
