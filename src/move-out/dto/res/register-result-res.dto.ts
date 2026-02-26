import { ApiProperty } from '@nestjs/swagger';

export class RegisterResultResDto {
  @ApiProperty({
    description: 'Presigned URL for file upload (Expires in 5 minutes)',
    example: 'https://example.com/presigned-url',
  })
  presignedUrl: string;
}
