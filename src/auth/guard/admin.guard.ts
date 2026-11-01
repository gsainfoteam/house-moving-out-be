import {
  Injectable,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { User } from 'generated/prisma/client';
import { isAdminRole } from '../utils/role.util';
import { UserGuard } from './user.guard';

@Injectable()
export class AdminGuard extends UserGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const { user } = context.switchToHttp().getRequest<{ user: User }>();
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException('user is not admin');
    }

    return true;
  }
}
