import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { JwtPayload } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

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

  async validate(payload: JwtPayload & { sessionId?: string }) {
    const { sub, sessionId } = payload;
    if (!sub) throw new UnauthorizedException('invalid token');
    if (!sessionId) throw new UnauthorizedException('sessionId missing');

    const user = await this.authService.findUser(sub);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('user is not admin');
    }
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
