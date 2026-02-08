import { ApiProperty } from '@nestjs/swagger';

export class UpdateInspectionTargetsResDto {
  @ApiProperty({
    description: 'Updated target count',
    example: 425,
  })
  count: number;
}
