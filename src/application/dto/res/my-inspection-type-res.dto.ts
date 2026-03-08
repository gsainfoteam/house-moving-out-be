import { ApiProperty } from '@nestjs/swagger';
import {
  InspectionTargetInfo,
  RoomInspectionType,
} from 'generated/prisma/client';

export class MyInspectionTypeResDto {
  constructor(target: InspectionTargetInfo) {
    this.inspectionType = target.inspectionType;
  }

  @ApiProperty({
    description: 'Inspection type',
    enum: RoomInspectionType,
    example: RoomInspectionType.FULL,
  })
  inspectionType: RoomInspectionType;
}
