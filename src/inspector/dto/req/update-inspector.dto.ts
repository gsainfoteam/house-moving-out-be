import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateInspectorDto {
  @ApiProperty({
    example: ['1', '2'],
    description: 'Available inspection slot IDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  availableSlotIds: number[];
}
