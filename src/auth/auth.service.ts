import { InfoteamIdpService } from '@lib/infoteam-idp';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { Admin, ConsentType, User } from 'generated/prisma/client';
import * as crypto from 'crypto';
import { IssueTokenType } from './types/jwtToken.type';
import { JwtToken } from './dto/res/jwtToken.dto';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { ConsentRequiredException } from './exceptions/consent-required.exception';
import {
  PolicyVersion,
  UserConsent,
  ConsentRequirement,
  ConsentData,
} from './types/consent.type';
import { PrismaTransaction } from '../common/types';
import { PrismaService } from '@lib/prisma';
import { CreateNewPolicyResponseDto } from './dto/res/createNewPolicyResponse.dto';
import { UserLoginDto } from './dto/req/userLogin.dto';
import { CreateNewPolicyDto } from './dto/req/createNewPolicy.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly infoteamIdpService: InfoteamIdpService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async adminLogin(auth: string): Promise<IssueTokenType> {
    const idpToken = auth.split(' ')[1];
    const userinfo = await this.infoteamIdpService.getUserInfo(idpToken);
    await this.authRepository.findAdmin(userinfo.id);
    await this.authRepository.deleteAllAdminRefreshTokens(userinfo.id);
    const sessionId = this.generateSessionId();
    return await this.issueAdminTokens(userinfo.id, sessionId);
  }

  async findAdmin(id: string): Promise<Admin> {
    return this.authRepository.findAdmin(id);
  }

  async adminRefresh(refreshToken: string): Promise<JwtToken> {
    const hashedToken = this.hashRefreshToken(refreshToken);
    const { adminId, sessionId } =
      await this.authRepository.findAdminByRefreshToken(hashedToken);
    return {
      access_token: this.jwtService.sign(
        { sessionId },
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

  async adminLogout(adminId: string): Promise<void> {
    await this.authRepository.deleteAllAdminRefreshTokens(adminId);
  }

  async userLogin(auth: string, body?: UserLoginDto): Promise<IssueTokenType> {
    const idpToken = auth.split(' ')[1];
    if (!idpToken) throw new UnauthorizedException();
    const userinfo = await this.infoteamIdpService.getUserInfo(idpToken);

    const consentData: ConsentData = {
      agreedToTerms: body?.agreedToTerms,
      agreedToPrivacy: body?.agreedToPrivacy,
      termsVersion: body?.termsVersion,
      privacyVersion: body?.privacyVersion,
    };

    const { refreshToken, sessionId } = await this.prismaService.$transaction(
      async (tx: PrismaTransaction) => {
        const user = await this.authRepository.upsertUserInTx(userinfo, tx);

        await this.validateAndHandleConsentsInTransaction(
          user,
          consentData,
          tx,
        );

        await this.authRepository.deleteAllUserRefreshTokensInTx(user.id, tx);

        const token = this.generateOpaqueToken();
        const sessionId = this.generateSessionId();
        const hashedToken = this.hashRefreshToken(token);
        await this.authRepository.setUserRefreshTokenInTx(
          user.id,
          hashedToken,
          sessionId,
          tx,
        );

        return { refreshToken: token, sessionId };
      },
    );

    const accessToken = this.jwtService.sign(
      { sessionId },
      {
        subject: userinfo.id,
        secret: this.configService.getOrThrow<string>('USER_JWT_SECRET'),
        expiresIn:
          this.configService.getOrThrow<StringValue>('USER_JWT_EXPIRE'),
        algorithm: 'HS256',
        audience: this.configService.getOrThrow<string>('USER_JWT_AUDIENCE'),
        issuer: this.configService.getOrThrow<string>('USER_JWT_ISSUER'),
      },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async validateAndHandleConsentsInTransaction(
    user: User,
    consentData: ConsentData,
    tx: PrismaTransaction,
  ): Promise<void> {
    const [
      activeTermsPolicy,
      activePrivacyPolicy,
      latestTermsConsent,
      latestPrivacyConsent,
    ] = await Promise.all([
      this.authRepository.getActivePolicyVersionInTx(
        ConsentType.TERMS_OF_SERVICE,
        tx,
      ),
      this.authRepository.getActivePolicyVersionInTx(
        ConsentType.PRIVACY_POLICY,
        tx,
      ),
      this.authRepository.getLatestUserConsentInTx(
        user.id,
        ConsentType.TERMS_OF_SERVICE,
        tx,
      ),
      this.authRepository.getLatestUserConsentInTx(
        user.id,
        ConsentType.PRIVACY_POLICY,
        tx,
      ),
    ]);

    const termsRequirement = this.checkConsentRequirement(
      latestTermsConsent,
      activeTermsPolicy,
    );
    const privacyRequirement = this.checkConsentRequirement(
      latestPrivacyConsent,
      activePrivacyPolicy,
    );

    if (termsRequirement.needsConsent || privacyRequirement.needsConsent) {
      this.validateConsentData(
        consentData,
        termsRequirement,
        privacyRequirement,
        activeTermsPolicy,
        activePrivacyPolicy,
      );

      await this.saveUserConsentsInTransaction(
        user,
        consentData,
        termsRequirement.needsConsent,
        privacyRequirement.needsConsent,
        tx,
      );
    }
  }

  private checkConsentRequirement(
    latestConsent: UserConsent | null,
    activePolicy: PolicyVersion | null,
  ): ConsentRequirement {
    const needsConsent: boolean =
      !latestConsent ||
      (activePolicy !== null && latestConsent.version !== activePolicy.version);
    const hasNeverConsented: boolean = !latestConsent;

    return {
      needsConsent,
      hasNeverConsented,
      currentVersion: latestConsent?.version,
      requiredVersion: activePolicy?.version ?? 'POLICY_NOT_SET',
    };
  }

  private validateConsentData(
    consentData: ConsentData,
    termsRequirement: ConsentRequirement,
    privacyRequirement: ConsentRequirement,
    activeTermsPolicy: PolicyVersion | null,
    activePrivacyPolicy: PolicyVersion | null,
  ): void {
    const { agreedToTerms, agreedToPrivacy, termsVersion, privacyVersion } =
      consentData;

    const isFirstLogin =
      termsRequirement.hasNeverConsented ||
      privacyRequirement.hasNeverConsented;

    const missingConsents: {
      terms?: { currentVersion?: string; requiredVersion: string };
      privacy?: { currentVersion?: string; requiredVersion: string };
    } = {};

    if (termsRequirement.needsConsent) {
      if (!agreedToTerms || !termsVersion) {
        missingConsents.terms = {
          currentVersion: termsRequirement.currentVersion,
          requiredVersion: termsRequirement.requiredVersion,
        };
      }
    }

    if (privacyRequirement.needsConsent) {
      if (!agreedToPrivacy || !privacyVersion) {
        missingConsents.privacy = {
          currentVersion: privacyRequirement.currentVersion,
          requiredVersion: privacyRequirement.requiredVersion,
        };
      }
    }

    if (missingConsents.terms || missingConsents.privacy) {
      throw new ConsentRequiredException(
        isFirstLogin
          ? 'Consent required for first login'
          : 'Consent required for updated policy',
        isFirstLogin ? 'CONSENT_REQUIRED' : 'CONSENT_UPDATE_REQUIRED',
        missingConsents,
      );
    }

    const versionErrors: {
      terms?: { currentVersion?: string; requiredVersion: string };
      privacy?: { currentVersion?: string; requiredVersion: string };
    } = {};

    if (
      termsRequirement.needsConsent &&
      activeTermsPolicy &&
      termsVersion !== activeTermsPolicy.version
    ) {
      versionErrors.terms = {
        currentVersion: termsRequirement.currentVersion,
        requiredVersion: activeTermsPolicy.version,
      };
    }

    if (
      privacyRequirement.needsConsent &&
      activePrivacyPolicy &&
      privacyVersion !== activePrivacyPolicy.version
    ) {
      versionErrors.privacy = {
        currentVersion: privacyRequirement.currentVersion,
        requiredVersion: activePrivacyPolicy.version,
      };
    }

    if (versionErrors.terms || versionErrors.privacy) {
      throw new ConsentRequiredException(
        'Invalid consent version',
        'CONSENT_UPDATE_REQUIRED',
        versionErrors,
      );
    }
  }

  private async saveUserConsentsInTransaction(
    user: User,
    consentData: ConsentData,
    needTermsConsent: boolean,
    needPrivacyConsent: boolean,
    tx: PrismaTransaction,
  ): Promise<void> {
    const { termsVersion, privacyVersion } = consentData;

    const consentsToCreate: Array<{
      consentType: ConsentType;
      version: string;
    }> = [];

    if (needTermsConsent && termsVersion) {
      consentsToCreate.push({
        consentType: ConsentType.TERMS_OF_SERVICE,
        version: termsVersion,
      });
    }

    if (needPrivacyConsent && privacyVersion) {
      consentsToCreate.push({
        consentType: ConsentType.PRIVACY_POLICY,
        version: privacyVersion,
      });
    }

    if (consentsToCreate.length > 0) {
      await this.authRepository.createUserConsentsInTx(
        user.id,
        consentsToCreate,
        tx,
      );
    }
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
  }

  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private hashRefreshToken(token: string): string {
    const secret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_HMAC_SECRET',
    );
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  private async issueAdminTokens(
    id: string,
    sessionId: string,
  ): Promise<IssueTokenType> {
    const refresh_token: string = this.generateOpaqueToken();
    const hashedToken = this.hashRefreshToken(refresh_token);
    await this.authRepository.setAdminRefreshToken(id, hashedToken, sessionId);
    return {
      access_token: this.jwtService.sign(
        { sessionId },
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

  async findUser(id: string): Promise<User> {
    return this.authRepository.findUser(id);
  }

  async findAdminRefreshTokenBySessionId(adminId: string, sessionId: string) {
    return this.authRepository.findAdminRefreshTokenBySessionId(
      adminId,
      sessionId,
    );
  }

  async findUserRefreshTokenBySessionId(userId: string, sessionId: string) {
    return this.authRepository.findUserRefreshTokenBySessionId(
      userId,
      sessionId,
    );
  }

  async userRefresh(refreshToken: string): Promise<JwtToken> {
    const hashedToken = this.hashRefreshToken(refreshToken);
    const { userId, sessionId } =
      await this.authRepository.findUserByRefreshToken(hashedToken);
    return {
      access_token: this.jwtService.sign(
        { sessionId },
        {
          subject: userId,
          secret: this.configService.getOrThrow<string>('USER_JWT_SECRET'),
          expiresIn:
            this.configService.getOrThrow<StringValue>('USER_JWT_EXPIRE'),
          algorithm: 'HS256',
          audience: this.configService.getOrThrow<string>('USER_JWT_AUDIENCE'),
          issuer: this.configService.getOrThrow<string>('USER_JWT_ISSUER'),
        },
      ),
    };
  }

  async userLogout(userId: string): Promise<void> {
    await this.authRepository.deleteAllUserRefreshTokens(userId);
  }

  async createNewPolicyVersion({
    type,
    version,
  }: CreateNewPolicyDto): Promise<CreateNewPolicyResponseDto> {
    return await this.authRepository.createNewPolicyVersion({ type, version });
  }
}
