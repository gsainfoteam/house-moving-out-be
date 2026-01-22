import { ApiProperty } from '@nestjs/swagger';
import { ConsentType } from 'generated/prisma/client';
import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

export class CreateNewPolicyDto {
  @ApiProperty({
    description:
      'Policy type. Must be one of: TERMS_OF_SERVICE, PRIVACY_POLICY',
    enum: ConsentType,
    example: ConsentType.TERMS_OF_SERVICE,
  })
  @IsEnum(ConsentType, {
    message: `type must be one of: ${Object.values(ConsentType).join(', ')}`,
  })
  @IsNotEmpty()
  type: ConsentType;

  @ApiProperty({
    description: 'Policy version',
    example: '1.0.0',
  })
  @IsString()
  @IsNotEmpty()
  version: string;
}
