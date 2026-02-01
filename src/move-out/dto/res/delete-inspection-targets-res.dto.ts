import { ApiProperty } from '@nestjs/swagger';

export class DeleteInspectionTargetsResDto {
  @ApiProperty({
    description: 'Deleted target count',
    example: 425,
  })
  count: number;
}
