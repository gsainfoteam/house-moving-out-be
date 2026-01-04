import { ApiProperty } from '@nestjs/swagger';

class ConsentVersionInfo {
  @ApiProperty({
    description: 'Current version of the consent',
    example: null,
    nullable: true,
  })
  currentVersion?: string | null;

  @ApiProperty({
    description: 'Required version of the consent',
    example: '1.0.0',
  })
  requiredVersion: string;
}

class RequiredConsents {
  @ApiProperty({
    type: ConsentVersionInfo,
    required: false,
  })
  terms?: ConsentVersionInfo;

  @ApiProperty({
    type: ConsentVersionInfo,
    required: false,
  })
  privacy?: ConsentVersionInfo;
}

export class ConsentRequiredErrorDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Consent required for first login',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'CONSENT_REQUIRED',
    enum: ['CONSENT_REQUIRED', 'CONSENT_UPDATE_REQUIRED'],
  })
  errorCode: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 403,
  })
  statusCode: number;

  @ApiProperty({
    type: RequiredConsents,
    required: false,
  })
  requiredConsents?: RequiredConsents;
}
