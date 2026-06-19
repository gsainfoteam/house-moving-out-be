import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApplicationStatus } from 'generated/prisma/enums';

export class UpdateInspectionStatusByAdminDto {
  @ApiProperty({
    description: 'Pass/fail status to set manually by admin.',
    example: ApplicationStatus.PASSED,
    enum: [ApplicationStatus.PASSED, ApplicationStatus.FAILED],
  })
  @IsIn([ApplicationStatus.PASSED, ApplicationStatus.FAILED])
  status: ApplicationStatus;

  @ApiProperty({
    description: 'Comment explaining the manual status change.',
    example: 'Admin confirmed pass after re-review.',
  })
  @IsString()
  @IsNotEmpty()
  additionalComment: string;
}
