import { ApiProperty } from '@nestjs/swagger';
import { InspectionType } from '../../types/inspection-type.enum';

class Resident {
  @ApiProperty({
    description: 'Student name',
    example: '홍길동',
  })
  name: string;

  @ApiProperty({
    description: 'Admission year',
    example: '25',
  })
  admissionYear: string;
}

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
    description: 'Residents in the room',
    type: [Resident],
  })
  residents: Resident[];

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

  @ApiProperty({
    description: 'Inspection type',
    example: InspectionType.SOLO,
    enum: InspectionType,
  })
  inspectionType: InspectionType;

  @ApiProperty({
    description: 'Inspector name',
    example: '김검사',
  })
  inspectorName: string;

  @ApiProperty({
    description: 'Whether the inspection is passed',
    example: true,
    nullable: true,
  })
  isPassed: boolean | null;
}
export class FindAllInspectionApplicationsResDto {
  @ApiProperty({
    description: 'List of detailed inspection applications',
    type: [DetailedApplication],
  })
  detailedApplications: DetailedApplication[];
}
