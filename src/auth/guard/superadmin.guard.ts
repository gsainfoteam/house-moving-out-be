import {
  Injectable,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { UserGuard } from './user.guard';

@Injectable()
export class SuperAdminGuard extends UserGuard {
  handleRequest<TUser extends { role: Role }>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status: unknown,
  ): TUser {
    super.handleRequest(err, user, info, context, status);
    if (user.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('user is not superadmin');
    }

    return user;
  }
}
