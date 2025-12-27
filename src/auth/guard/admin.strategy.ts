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
      secretOrKey: configService.getOrThrow<string>('ADMIN_JWT_SECRET'),
      issuer: configService.getOrThrow<string>('ADMIN_JWT_ISSUER'),
      audience: configService.getOrThrow<string>('ADMIN_JWT_AUDIENCE'),
    });
  }

  async validate({ sub }: JwtPayload) {
    if (!sub) throw new UnauthorizedException('invalid token');
    return await this.authService.findAdmin(sub).catch(() => {
      throw new UnauthorizedException();
    });
  }
}
