import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsUUID } from 'class-validator';

export class BulkUpdateCleaningServiceDto {
  @ApiProperty({
    description:
      'List of inspection target UUIDs whose cleaning service flag will be updated',
    example: [
      '11111111-2222-3333-4444-555555555555',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  targetUuids: string[];

  @ApiProperty({
    description: 'Whether to apply external cleaning service',
    example: true,
  })
  @IsBoolean()
  applyCleaningService: boolean;
}
