import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate } from 'class-validator';

export class UpdateInspectorDto {
  @ApiProperty({
    example: ['2025-01-01T10:00:00.000Z', '2025-01-02T14:00:00.000Z'],
    description: 'Available inspection times',
    type: [Date],
  })
  @IsArray()
  @IsDate({ each: true })
  @Type(() => Date)
  availableTimes: Date[];
}
