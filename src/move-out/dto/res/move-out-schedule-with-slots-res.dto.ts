import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { MoveOutScheduleResDto } from './move-out-schedule-res.dto';
import { SemesterResDto } from './semester-res.dto';

export class InspectionSlotResDto {
  @ApiProperty({
    description: '검사 슬롯 고유 ID (UUID)',
    example: '56557838-403f-431f-8da2-669f7b5aadd6',
  })
  uuid: string;

  @ApiProperty({
    description: '퇴사 검사 일정 ID',
    example: 3,
  })
  scheduleId: number;

  @ApiProperty({
    description: '슬롯 시작 시간',
    example: '2026-02-05T04:00:00.000Z',
  })
  startTime: Date;

  @ApiProperty({
    description: '슬롯 종료 시간',
    example: '2026-02-05T04:30:00.000Z',
  })
  endTime: Date;

  @ApiProperty({
    description: '남자 최대 수용 인원',
    example: 7,
  })
  maleCapacity: number;

  @ApiProperty({
    description: '여자 최대 수용 인원',
    example: 5,
  })
  femaleCapacity: number;

  @ApiProperty({
    description: '남자 현재 예약된 인원',
    example: 0,
  })
  maleReservedCount: number;

  @ApiProperty({
    description: '여자 현재 예약된 인원',
    example: 0,
  })
  femaleReservedCount: number;
}

export class MoveOutScheduleWithSlotsResDto extends MoveOutScheduleResDto {
  @ApiProperty({
    type: [InspectionSlotResDto],
    description: '해당 퇴사 검사 일정에 포함된 모든 검사 슬롯 목록',
  })
  @ValidateNested({ each: true })
  @Type(() => InspectionSlotResDto)
  inspectionSlots: InspectionSlotResDto[];

  @ApiProperty({
    type: SemesterResDto,
    description: '현재 학기 정보',
  })
  @ValidateNested()
  @Type(() => SemesterResDto)
  currentSemester: SemesterResDto;

  @ApiProperty({
    type: SemesterResDto,
    description: '다음 학기 정보',
  })
  @ValidateNested()
  @Type(() => SemesterResDto)
  nextSemester: SemesterResDto;
}
