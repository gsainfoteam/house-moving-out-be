import { ApiProperty } from '@nestjs/swagger';

export class UpdateInspectionTargetsDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Excel file (.xlsx)',
  })
  file: Express.Multer.File;
}
