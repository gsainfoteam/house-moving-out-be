import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Admin, User } from 'generated/prisma/client';

export type AdminUser = { user: User; admin: Admin };

export const GetAdmin = createParamDecorator(
  (_data, ctx: ExecutionContext): AdminUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AdminUser }>();

    return req.user;
  },
);
