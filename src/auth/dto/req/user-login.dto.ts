import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UserLoginDto {
  @ApiPropertyOptional({
    description: 'Whether user agreed to terms of service',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  agreedToTerms?: boolean;

  @ApiPropertyOptional({
    description: 'Whether user agreed to privacy policy',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  agreedToPrivacy?: boolean;

  @ApiPropertyOptional({
    description: 'Version of terms of service',
    example: '260301',
  })
  @ValidateIf((o: UserLoginDto) => o.agreedToTerms === true)
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  termsVersion?: string;

  @ApiPropertyOptional({
    description: 'Version of privacy policy',
    example: '260301',
  })
  @ValidateIf((o: UserLoginDto) => o.agreedToPrivacy === true)
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  privacyVersion?: string;
}
