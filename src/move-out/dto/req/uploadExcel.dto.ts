import { ApiProperty } from '@nestjs/swagger';

export class UploadExcelDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Excel file (.xlsx)',
  })
  file: Express.Multer.File;
}
