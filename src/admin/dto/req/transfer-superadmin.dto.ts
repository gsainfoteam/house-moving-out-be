import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferSuperAdminDto {
  @ApiProperty({
    description: 'Target user UUID to become SUPERADMIN',
    example: 'd3b07384-d9a1-4f5c-8e2e-1234567890ab',
  })
  @IsUUID()
  targetUserUuid: string;
}
