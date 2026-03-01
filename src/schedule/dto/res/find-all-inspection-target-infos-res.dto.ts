import { ApiProperty } from '@nestjs/swagger';
import { RoomInspectionType } from 'generated/prisma/client';

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

export class InspectionTargetsGroupedByRoomResDto {
  @ApiProperty({
    description: 'Inspection target UUID',
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
    description: 'List of residents in the room',
    type: [Resident],
  })
  residents: Resident[];

  @ApiProperty({
    description: 'Inspection type',
    example: RoomInspectionType.SOLO,
    enum: RoomInspectionType,
  })
  inspectionType: RoomInspectionType;

  @ApiProperty({
    description: 'Number of inspections',
    example: 2,
  })
  inspectionCount: number;

  @ApiProperty({
    description: 'Whether external cleaning service is applied for this room',
    example: false,
  })
  applyCleaningService: boolean;

  @ApiProperty({
    description: 'Last inspection time',
    example: '2026-01-22T03:00:00.000Z',
    nullable: true,
    type: Date,
  })
  lastInspectionTime: Date | null;

  @ApiProperty({
    description: 'Whether the inspection is passed',
    example: true,
    nullable: true,
    type: Boolean,
  })
  isPassed: boolean | null;
}
