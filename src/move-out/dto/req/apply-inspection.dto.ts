import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ApplyInspectionDto {
  @ApiProperty({
    description: 'Inspection slot UUID',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
  })
  @IsString()
  inspectionSlotUuid: string;
}
