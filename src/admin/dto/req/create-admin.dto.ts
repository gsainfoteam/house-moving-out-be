import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({
    description: 'User name',
    example: '홍길동',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User student number',
    example: '20250000',
  })
  @IsString()
  studentNumber: string;
}
