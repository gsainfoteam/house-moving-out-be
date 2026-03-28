import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class InspectorQueryDto {
  @ApiProperty({
    example: 'd3b07384-d9a1-4f5c-8e2e-1234567890ab',
    description: 'Schedule UUID',
  })
  @IsUUID()
  scheduleUuid: string;
}
