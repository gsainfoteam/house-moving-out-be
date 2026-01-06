import { ApiProperty } from '@nestjs/swagger';
import { ConsentType } from 'generated/prisma/client';

export class CreateNewPolicyResponseDto {
  @ApiProperty({
    description: 'Policy version ID',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Policy type',
    enum: ConsentType,
    example: ConsentType.TERMS_OF_SERVICE,
  })
  type: ConsentType;

  @ApiProperty({
    description: 'Policy version',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: 'Whether the policy is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Created date',
    example: '2026-01-15T00:00:00.000Z',
  })
  createdAt: Date;
}
