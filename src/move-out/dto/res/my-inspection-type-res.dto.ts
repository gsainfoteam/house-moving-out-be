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
    description: '퇴사검사 유형',
    enum: RoomInspectionType,
    example: RoomInspectionType.FULL,
  })
  inspectionType: RoomInspectionType;
}
