import { ApiProperty } from '@nestjs/swagger';
import { ScheduleStatus } from 'generated/prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateScheduleStatusDto {
  @ApiProperty({
    enum: ScheduleStatus,
    description: 'The new status of the schedule',
    example: ScheduleStatus.ACTIVE,
  })
  @IsEnum(ScheduleStatus)
  status: ScheduleStatus;
}
