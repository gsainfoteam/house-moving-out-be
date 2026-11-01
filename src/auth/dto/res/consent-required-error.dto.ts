import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ConsentVersionInfo {
  @ApiPropertyOptional({
    description: 'Current version of the consent',
    example: null,
    nullable: true,
    type: String,
  })
  currentVersion?: string | null;

  @ApiProperty({
    description: 'Required version of the consent',
    example: '260301',
  })
  requiredVersion: string;
}

class RequiredConsents {
  @ApiProperty({
    type: ConsentVersionInfo,
    description: 'Terms of service consent information',
  })
  terms: ConsentVersionInfo;

  @ApiProperty({
    type: ConsentVersionInfo,
    description: 'Privacy policy consent information',
  })
  privacy: ConsentVersionInfo;
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
    description: 'Required consent information',
  })
  requiredConsents: RequiredConsents;
}
