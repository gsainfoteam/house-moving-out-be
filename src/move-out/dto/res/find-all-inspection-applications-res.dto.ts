import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DetailedApplication {
  @ApiProperty({
    description: 'Application UUID',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
    format: 'uuid',
  })
  uuid: string;

  @ApiProperty({
    description: 'Room number',
    example: 'XXX101',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'Student name',
    example: '홍길동',
  })
  studentName: string;

  @ApiProperty({
    description: 'Phone number',
    example: '010-1234-5678',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Application time',
    example: '2026-01-22T03:00:00.000Z',
  })
  applicationTime: Date;

  @ApiProperty({
    description: 'Inspection time',
    example: '2026-01-22T03:30:00.000Z',
  })
  inspectionTime: Date;

  // inspectionType:InspectionType;

  @ApiProperty({
    description: 'Inspector name',
    example: '김검사',
  })
  inspectorName: string;

  @ApiPropertyOptional({
    description: 'Whether the inspection is passed',
    example: true,
  })
  isPassed?: boolean;
}
export class FindAllInspectionApplicationsResDto {
  @ApiProperty({
    description: 'List of detailed inspection applications',
    type: [DetailedApplication],
  })
  detailedApplications: DetailedApplication[];
}
