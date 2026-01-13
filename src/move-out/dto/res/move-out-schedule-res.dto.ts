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
    example: '2025-12-01',
  })
  applicationStartDate: Date;

  @ApiProperty({
    description: '신청 종료 날짜',
    example: '2025-12-05',
  })
  applicationEndDate: Date;

  @ApiProperty({
    description: '검사 시작 날짜',
    example: '2025-12-10',
  })
  inspectionStartDate: Date;

  @ApiProperty({
    description: '검사 종료 날짜',
    example: '2025-12-15',
  })
  inspectionEndDate: Date;
  @ApiProperty({
    description: '생성 날짜',
    example: '2025-12-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '업데이트 날짜',
    example: '2025-12-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
