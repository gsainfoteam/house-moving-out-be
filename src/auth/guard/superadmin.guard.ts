import {
  Injectable,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { Role, User } from 'generated/prisma/client';
import { UserGuard } from './user.guard';

@Injectable()
export class SuperAdminGuard extends UserGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const { user } = context.switchToHttp().getRequest<{ user: User }>();
    if (user.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('user is not superadmin');
    }

    return true;
  }
}
