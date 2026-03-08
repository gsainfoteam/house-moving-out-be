import { Loggable } from '@lib/logger';
import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/res/user.dto';
import { User } from 'generated/prisma/client';
import { ScheduleService } from 'src/schedule/schedule.service';

@Loggable()
@Injectable()
export class UserService {
  constructor(private readonly scheduleService: ScheduleService) {}

  async getMe(user: User): Promise<UserDto> {
    const targetInfo =
      await this.scheduleService.findTargetInfoByUserInfo(user);
    return new UserDto(user, targetInfo);
  }
}
