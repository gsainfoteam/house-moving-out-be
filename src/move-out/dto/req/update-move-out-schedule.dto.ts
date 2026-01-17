import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateMoveOutScheduleDto {
  @ApiPropertyOptional({
    example: '2025 가을학기 정규 퇴사검사 (수정)',
    description: '퇴사 검사 일정 제목',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: '2025-11-30T15:00:00.000Z',
    description: '신청 시작 날짜',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  applicationStartDate?: Date;

  @ApiPropertyOptional({
    example: '2025-12-04T15:00:00.000Z',
    description: '신청 종료 날짜',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  applicationEndDate?: Date;

  @ApiPropertyOptional({
    example: '2025-12-09T15:00:00.000Z',
    description: '검사 시작 날짜',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  inspectionStartDate?: Date;

  @ApiPropertyOptional({
    example: '2025-12-14T15:00:00.000Z',
    description: '검사 종료 날짜',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  inspectionEndDate?: Date;
}
