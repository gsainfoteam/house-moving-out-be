import { ApiProperty } from '@nestjs/swagger';

export class ApplicationUuidResDto {
  @ApiProperty({
    description: 'Application UUID',
    example: '12345678-0000-0000-a456-aaaaaabbbbbb',
  })
  applicationUuid: string;
}
