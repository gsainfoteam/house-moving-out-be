import { ApiProperty } from '@nestjs/swagger';
import { InspectionType } from '../../types/inspection-type.enum';

class Resident {
  @ApiProperty({
    description: 'Admission year of the resident',
    example: '20',
  })
  admissionYear: string;

  @ApiProperty({
    description: 'Name of the resident',
    example: '홍길동',
  })
  name: string;
}

export class InspectionTargetsGroupedByRoom {
  @ApiProperty({
    description: 'Room number',
    example: 'XXX101',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'List of residents in the room',
    type: [Resident],
  })
  residents: Resident[];

  @ApiProperty({
    description: 'Inspection type',
    example: InspectionType.SOLO,
    enum: InspectionType,
  })
  inspectionType: InspectionType;

  @ApiProperty({
    description: 'Number of inspections',
    example: 2,
  })
  inspectionCount: number;

  @ApiProperty({
    description: 'Last inspection time',
    example: '2026-01-22T03:00:00.000Z',
    nullable: true,
  })
  lastInspectionTime: Date | null;

  @ApiProperty({
    description: 'Whether the inspection is passed',
    example: true,
    nullable: true,
  })
  isPassed: boolean | null;
}

export class FindAllInspectionTargetsResDto {
  @ApiProperty({
    description: 'List of inspection targets grouped by room',
    type: [InspectionTargetsGroupedByRoom],
  })
  inspectionTargetsGroupedByRooms: InspectionTargetsGroupedByRoom[];
}
