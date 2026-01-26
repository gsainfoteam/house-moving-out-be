import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminStrategy extends PassportStrategy(Strategy, 'admin') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('USER_JWT_SECRET'),
      issuer: configService.getOrThrow<string>('USER_JWT_ISSUER'),
      audience: configService.getOrThrow<string>('USER_JWT_AUDIENCE'),
    });
  }

  async validate(
    payload: JwtPayload & { sessionId?: string; isAdmin?: boolean },
  ) {
    const { sub, isAdmin, sessionId } = payload;
    if (!sub) throw new UnauthorizedException('invalid token');
    if (!sessionId) throw new UnauthorizedException('sessionId missing');
    if (!isAdmin) throw new UnauthorizedException('user is not an admin');

    const user = await this.authService.findUser(sub);
    const refreshToken = await this.authService.findUserRefreshTokenBySessionId(
      sub,
      sessionId,
    );
    if (!refreshToken) {
      throw new UnauthorizedException('invalid session');
    }

    return user;
  }
}
