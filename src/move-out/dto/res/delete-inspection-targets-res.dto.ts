import { ApiProperty } from '@nestjs/swagger';

export class DeleteInspectionTargetsResDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Inspection targets successfully deleted',
  })
  message: string;

  @ApiProperty({
    description: 'Deleted target count',
    example: 425,
  })
  count: number;
}
