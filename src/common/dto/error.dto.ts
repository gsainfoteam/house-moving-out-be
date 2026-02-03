import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  error: string;

  @ApiProperty()
  statusCode: number;
}
