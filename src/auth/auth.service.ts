import { InfoteamIdpService } from '@lib/infoteam-idp';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { Admin } from 'generated/prisma/client';
import * as crypto from 'crypto';
import { IssueTokenType } from './types/jwtToken.type';
import { JwtToken } from './dto/jwtToken.dto';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private readonly infoteamIdpService: InfoteamIdpService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async adminLogin(auth: string): Promise<IssueTokenType> {
    const idpToken = auth.split(' ')[1];
    const userinfo = await this.infoteamIdpService.getUserInfo(idpToken);
    await this.authRepository.findAdmin(userinfo.id);
    await this.authRepository.deleteExpiredAdminRefreshTokens(userinfo.id);
    return await this.issueTokens(userinfo.id);
  }

  async findAdmin(id: string): Promise<Admin> {
    return this.authRepository.findAdmin(id);
  }

  async adminRefresh(refreshToken: string): Promise<JwtToken> {
    const { adminId } =
      await this.authRepository.findAdminRefreshToken(refreshToken);
    return {
      access_token: this.jwtService.sign(
        {},
        {
          subject: adminId,
          secret: this.configService.getOrThrow<string>('ADMIN_JWT_SECRET'),
          expiresIn:
            this.configService.getOrThrow<StringValue>('ADMIN_JWT_EXPIRE'),
          algorithm: 'HS256',
          audience: this.configService.getOrThrow<string>('ADMIN_JWT_AUDIENCE'),
          issuer: this.configService.getOrThrow<string>('ADMIN_JWT_ISSUER'),
        },
      ),
    };
  }

  async adminLogout(adminId: string, refreshToken: string): Promise<void> {
    await this.authRepository.deleteAdminRefreshToken(adminId, refreshToken);
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
  }

  private async issueTokens(id: string): Promise<IssueTokenType> {
    const refresh_token: string = this.generateOpaqueToken();
    await this.authRepository.setAdminRefreshToken(id, refresh_token);
    return {
      access_token: this.jwtService.sign(
        {},
        {
          subject: id,
          secret: this.configService.getOrThrow<string>('ADMIN_JWT_SECRET'),
          expiresIn:
            this.configService.getOrThrow<StringValue>('ADMIN_JWT_EXPIRE'),
          algorithm: 'HS256',
          audience: this.configService.getOrThrow<string>('ADMIN_JWT_AUDIENCE'),
          issuer: this.configService.getOrThrow<string>('ADMIN_JWT_ISSUER'),
        },
      ),
      refresh_token,
    };
  }
}
