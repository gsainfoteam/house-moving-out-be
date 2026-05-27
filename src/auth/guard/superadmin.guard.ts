import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { UserGuard } from './user.guard';

@Injectable()
export class SuperAdminGuard extends UserGuard {
  handleRequest<TUser extends { role: Role }>(
    err: unknown,
    user: TUser,
  ): TUser {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException('user is not superadmin');
    }

    return user;
  }
}
