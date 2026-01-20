import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class UpdateInspectorDto {
  @ApiProperty({
    example: [
      'd3b07384-d9a1-4f5c-8e2e-1234567890ab',
      'e4d909c2-7d2a-4f5c-9e3e-0987654321ba',
    ],
    description: 'Available inspection slot IDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  availableSlotIds: string[];
}
