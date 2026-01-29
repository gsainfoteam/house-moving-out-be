import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateInspectionDto {
  @ApiProperty({
    description: 'Inspection slot UUID',
    example: '123e4567-0000-0000-a456-aaaaaabbbbbb',
  })
  @IsUUID()
  inspectionSlotUuid: string;
}
