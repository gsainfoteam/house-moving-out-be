import { Injectable, ForbiddenException } from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { isAdminRole } from '../utils/role.util';
import { UserGuard } from './user.guard';

@Injectable()
export class AdminGuard extends UserGuard {
  handleRequest<TUser extends { role: Role }>(
    err: unknown,
    user: TUser,
  ): TUser {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException('user is not admin');
    }

    return user;
  }
}
