import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApplicationStatus } from 'generated/prisma/enums';

export class RecordTargetNoShowDto {
  @ApiProperty({
    description:
      'Application status. Only NO_SHOW and PENDING_NO_SHOW is allowed.',
    example: ApplicationStatus.NO_SHOW,
    enum: ApplicationStatus,
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
