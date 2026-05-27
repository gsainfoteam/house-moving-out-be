import {
  Injectable,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { isAdminRole } from '../utils/role.util';
import { UserGuard } from './user.guard';

@Injectable()
export class AdminGuard extends UserGuard {
  handleRequest<TUser extends { role: Role }>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status: unknown,
  ): TUser {
    super.handleRequest(err, user, info, context, status);
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException('user is not admin');
    }

    return user;
  }
}
