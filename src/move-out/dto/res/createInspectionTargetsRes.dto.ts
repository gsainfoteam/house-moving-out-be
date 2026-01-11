import { ApiProperty } from '@nestjs/swagger';

export class CreateInspectionTargetsResDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Inspection targets successfully created',
  })
  message: string;

  @ApiProperty({
    description: 'Saved target count',
    example: 425,
  })
  count: number;
}
