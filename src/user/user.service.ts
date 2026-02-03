import { Loggable } from '@lib/logger';
import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/res/user.dto';
import { MoveOutService } from 'src/move-out/move-out.service';
import { User } from 'generated/prisma/client';

@Loggable()
@Injectable()
export class UserService {
  constructor(private readonly moveOutService: MoveOutService) {}

  async getMe(user: User): Promise<UserDto> {
    const targetInfo = await this.moveOutService.findTargetInfoByUserInfo(user);
    return {
      ...user,
      gender: targetInfo?.gender,
      roomNumber: targetInfo?.roomNumber,
    };
  }
}
