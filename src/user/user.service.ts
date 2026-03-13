import { Loggable } from '@lib/logger';
import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/res/user.dto';
import { User } from 'generated/prisma/client';
import { ScheduleService } from 'src/schedule/schedule.service';
import { InspectorService } from 'src/inspector/inspector.service';

@Loggable()
@Injectable()
export class UserService {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly inspectorService: InspectorService,
  ) {}

  async getMe(user: User): Promise<UserDto> {
    const [targetInfo, isInspector] = await Promise.all([
      this.scheduleService.findTargetInfoByUserInfo(user),
      this.inspectorService.checkInspectorByUserInfo(user),
    ]);
    return new UserDto(user, targetInfo, isInspector);
  }
}
