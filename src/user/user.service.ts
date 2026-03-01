import { Loggable } from '@lib/logger';
import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/res/user.dto';
import { InspectionTargetService } from 'src/inspection-target/inspection-target.service';
import { User } from 'generated/prisma/client';

@Loggable()
@Injectable()
export class UserService {
  constructor(
    private readonly inspectionTargetService: InspectionTargetService,
  ) {}

  async getMe(user: User): Promise<UserDto> {
    const targetInfo =
      await this.inspectionTargetService.findTargetInfoByUserInfo(user);
    return new UserDto(user, targetInfo);
  }
}
