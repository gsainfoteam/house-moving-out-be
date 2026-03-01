import { ApiProperty } from '@nestjs/swagger';
import { RoomInspectionType } from 'generated/prisma/client';

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

export class AssignedTarget {
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
    description: 'Inspection time',
    example: '2026-01-22T03:30:00.000Z',
  })
  inspectionTime: Date;

  @ApiProperty({
    description: 'Inspection type',
    example: RoomInspectionType.SOLO,
    enum: RoomInspectionType,
  })
  inspectionType: RoomInspectionType;

  @ApiProperty({
    description: 'Whether the inspection is passed',
    example: true,
    nullable: true,
    type: Boolean,
  })
  isPassed: boolean | null;

  @ApiProperty({
    description: 'Inspection count',
    example: 2,
  })
  inspectionCount: number;
}

export class AssignedTargetsResDto {
  @ApiProperty({
    description: 'List of inspection targets assigned to the inspector',
    type: [AssignedTarget],
  })
  targets: AssignedTarget[];
}
