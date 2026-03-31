import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ChangeAssignedInspectorDto {
  @ApiProperty({
    description: 'UUID of the new inspector to be assigned',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  inspectorUuid: string;

  @ApiPropertyOptional({
    description:
      'UUID of the target application to change the assigned inspector for.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  targetApplicationUuid?: string;
}
