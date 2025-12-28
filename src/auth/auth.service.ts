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
    await this.authRepository.findAdmin(userinfo.id);
    return await this.issueTokens(userinfo.id);
  }

  async findAdmin(id: string): Promise<Admin> {
    return this.authRepository.findAdmin(id);
  }

  async adminRefresh(refreshToken: string): Promise<JwtToken> {
    const { adminId } =
      await this.authRepository.findAdminRefreshToken(refreshToken);
    return {
      access_token: this.jwtService.sign({}, { subject: adminId }),
    };
  }

  async adminLogout(adminId: string, refreshToken: string): Promise<void> {
    await this.authRepository.deleteAdminRefreshToken(adminId, refreshToken);
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    await this.authRepository.deleteExpiredAdminRefreshTokens();
    // TODO: 일반 사용자용 토큰도 삭제
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
  }

  private async issueTokens(id: string): Promise<IssueTokenType> {
    const refresh_token: string = this.generateOpaqueToken();
    await this.authRepository.setAdminRefreshToken(id, refresh_token);
    return {
      access_token: this.jwtService.sign({}, { subject: id }),
      refresh_token,
    };
  }
}
