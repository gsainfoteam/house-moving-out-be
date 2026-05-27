import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { UserGuard } from './user.guard';

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.SUPERADMIN];

@Injectable()
export class AdminGuard extends UserGuard {
  handleRequest<TUser extends { role: Role }>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    const authenticatedUser = super.handleRequest(
      err,
      user,
      info,
      context,
      status,
    );

    if (!ADMIN_ROLES.includes(authenticatedUser.role)) {
      throw new UnauthorizedException('user is not admin');
    }

    return authenticatedUser;
  }
}
