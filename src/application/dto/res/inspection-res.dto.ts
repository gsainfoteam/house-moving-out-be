import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InspectionSlotResDto } from '../../../schedule/dto/res/move-out-schedule-with-slots-res.dto';
import { ItemResultsResDto } from './application-res.dto';
import { JsonValue } from '@prisma/client/runtime/client';

export class InspectionResDto {
  @ApiProperty({
    description: 'Application UUID',
    example: '12345678-0000-0000-a456-aaaaaabbbbbb',
  })
  uuid: string;

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

  @ApiProperty({
    description: 'Inspection count',
    example: 1,
  })
  inspectionCount: number;

  @ApiPropertyOptional({
    description: 'Inspection item results',
    type: ItemResultsResDto,
    nullable: true,
  })
  @Type(() => ItemResultsResDto)
  itemResults?: ItemResultsResDto | JsonValue;
}
