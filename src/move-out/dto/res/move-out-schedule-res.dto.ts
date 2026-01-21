import { ApiProperty } from '@nestjs/swagger';

export class MoveOutScheduleResDto {
  @ApiProperty({
    description: '퇴사 검사 일정 고유 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '퇴사 검사 일정 제목',
    example: '2025 가을학기 정규 퇴사검사',
  })
  title: string;

  @ApiProperty({
    description: '신청 시작 날짜',
    example: '2025-11-30T15:00:00.000Z',
  })
  applicationStartTime: Date;

  @ApiProperty({
    description: '신청 종료 날짜',
    example: '2025-12-04T15:00:00.000Z',
  })
  applicationEndTime: Date;

  @ApiProperty({
    description: '현재 학기 UUID',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
  })
  currentSemesterUuid: string;

  @ApiProperty({
    description: '다음 학기 UUID',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
  })
  nextSemesterUuid: string;

  @ApiProperty({
    description: '생성 날짜',
    example: '2025-11-30T15:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '업데이트 날짜',
    example: '2025-11-30T15:00:00.000Z',
  })
  updatedAt: Date;
}
