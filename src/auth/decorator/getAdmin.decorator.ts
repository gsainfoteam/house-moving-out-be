import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Admin } from 'generated/prisma/client';

export const GetAdmin = createParamDecorator(
  (_data, ctx: ExecutionContext): Admin => {
    const req = ctx.switchToHttp().getRequest<{ user: Admin }>();

    return req.user;
  },
);
