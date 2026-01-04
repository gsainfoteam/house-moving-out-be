import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UserLoginDto {
  @ApiProperty({
    description: 'Whether user agreed to terms of service',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  agreedToTerms?: boolean;

  @ApiProperty({
    description: 'Whether user agreed to privacy policy',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  agreedToPrivacy?: boolean;

  @ApiProperty({
    description: 'Version of terms of service',
    required: false,
    example: '1.0.0',
  })
  @ValidateIf((o: UserLoginDto) => o.agreedToTerms === true)
  @IsString()
  termsVersion?: string;

  @ApiProperty({
    description: 'Version of privacy policy',
    required: false,
    example: '1.0.0',
  })
  @ValidateIf((o: UserLoginDto) => o.agreedToPrivacy === true)
  @IsString()
  privacyVersion?: string;
}
