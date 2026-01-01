import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateMoveOutScheduleDto {
  @ApiProperty({
    example: '2025 가을학기 정규 퇴사검사 (수정)',
    description: '퇴사 검사 일정 제목',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'true',
    description: '일정 활성화 여부',
    required: false,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @ApiProperty({
    example: '2025-12-01',
    description: '신청 시작 날짜',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  applicationStartDate?: Date;

  @ApiProperty({
    example: '2025-12-05',
    description: '신청 종료 날짜',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  applicationEndDate?: Date;

  @ApiProperty({
    example: '2025-12-10',
    description: '검사 시작 날짜',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  inspectionStartDate?: Date;

  @ApiProperty({
    example: '2025-12-15',
    description: '검사 종료 날짜',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  inspectionEndDate?: Date;
}
