import { InfoteamIdpService } from '@lib/infoteam-idp';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminRepository } from './admin.repository';
import { JwtToken } from './dto/jwtToken.dto';
import { Admin } from 'generated/prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly configService: ConfigService,
    private readonly infoteamIdpService: InfoteamIdpService,
    private readonly adminRepository: AdminRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(auth: string): Promise<JwtToken> {
    const idpToken = auth.split(' ')[1];
    const userinfo = await this.infoteamIdpService.getUserInfo(idpToken);
    await this.adminRepository.findAdmin(userinfo.uuid);
    const tokens = {
      access_token: this.jwtService.sign({}, { subject: userinfo.uuid }),
    };
    return { ...tokens };
  }

  async findAdmin(uuid: string): Promise<Admin> {
    return this.adminRepository.findAdmin(uuid);
  }
}
