import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class GetDocumentUploadUrlReqDto {
  @ApiProperty({
    description:
      'Content length of the inspection result (pdf file) Max is 3 * 1024 * 1024 bytes',
    example: 1024,
  })
  @IsNumber()
  @IsInt()
  @Max(3 * 1024 * 1024)
  @Min(1)
  contentLength: number;
}
