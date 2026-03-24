import { ApiPropertyOptional } from '@nestjs/swagger';

export class TargetPhoneNumberResDto {
  @ApiPropertyOptional({
    description: 'Target phone number for no-show notification',
    example: '+82 10 0000 0000',
  })
  targetPhoneNumber?: string;
}
