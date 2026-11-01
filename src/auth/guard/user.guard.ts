import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '@lib/database';
import { Request } from 'express';
import { User } from 'generated/prisma/client';
import { AccountService } from '../account';

@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly account: AccountService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    const session =
      scheme === 'Bearer' && token
        ? await this.account.verifySession(token)
        : null;
    if (!session) throw new UnauthorizedException();

    request.user = await this.userRepository.findUser(session.sub);
    return true;
  }
}
