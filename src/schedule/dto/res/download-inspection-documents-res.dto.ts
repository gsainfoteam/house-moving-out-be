import { ApiProperty } from '@nestjs/swagger';

export class DownloadInspectionDocumentsResDto {
  @ApiProperty({
    description: 'Total number of merged document pages',
    example: 12,
  })
  pages: number;

  @ApiProperty({
    description: 'Presigned S3 URL for downloading the merged PDF document',
    example: 'https://example-bucket.s3.amazonaws.com/temp/merged_document.pdf',
  })
  url: string;

  constructor(pages: number, url: string) {
    this.pages = pages;
    this.url = url;
  }
}
