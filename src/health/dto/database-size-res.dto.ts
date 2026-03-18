import { ApiProperty } from '@nestjs/swagger';

export class DatabaseSizeResDto {
  @ApiProperty({ description: 'The size of the database in bytes' })
  bytes: number;

  @ApiProperty({ description: 'The size of the database in a pretty format' })
  pretty: string;
}
