import { InfoteamIdpService } from '@lib/infoteam-idp';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { Admin } from 'generated/prisma/client';
import * as crypto from 'crypto';
import { IssueTokenType } from './types/jwtToken.type';
import { JwtToken } from './dto/jwtToken.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly infoteamIdpService: InfoteamIdpService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async adminLogin(auth: string): Promise<IssueTokenType> {
    const idpToken = auth.split(' ')[1];
    const userinfo = await this.infoteamIdpService.getUserInfo(idpToken);
    await this.authRepository.findAdmin(userinfo.uuid);
    return await this.issueTokens(userinfo.uuid);
  }

  async findAdmin(uuid: string): Promise<Admin> {
    return this.authRepository.findAdmin(uuid);
  }

  async adminRefresh(refreshToken: string): Promise<JwtToken> {
    const { adminId } =
      await this.authRepository.findAdminRefreshToken(refreshToken);
    return {
      access_token: this.jwtService.sign({}, { subject: adminId }),
    };
  }

  async adminLogout(refreshToken: string): Promise<void> {
    await this.authRepository.deleteAdminRefreshToken(refreshToken);
  }

  private generateOpaqueToken(): string {
    return crypto
      .randomBytes(32)
      .toString('base64')
      .replace(/[+//=]/g, '');
  }

  private async issueTokens(uuid: string): Promise<IssueTokenType> {
    const refresh_token: string = this.generateOpaqueToken();
    await this.authRepository.setAdminRefreshToken(uuid, refresh_token);
    return {
      access_token: this.jwtService.sign({}, { subject: uuid }),
      refresh_token,
    };
  }
}
