import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionSlotResDto } from './move-out-schedule-with-slots-res.dto';
import { Type } from 'class-transformer';

export class InspectionResDto {
  @ApiProperty({
    description: 'Application UUID',
    example: '12345678-0000-0000-a456-aaaaaabbbbbb',
  })
  applicationUuid: string;

  @ApiProperty({
    type: InspectionSlotResDto,
    description: 'Applied slot',
  })
  @Type(() => InspectionSlotResDto)
  inspectionSlot: InspectionSlotResDto;

  @ApiPropertyOptional({
    description: 'Whether inspection is passed',
  })
  isPassed?: boolean;
}
