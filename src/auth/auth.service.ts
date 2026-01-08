import { InfoteamIdpService } from '@lib/infoteam-idp';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { Admin, ConsentType, User } from 'generated/prisma/client';
import * as crypto from 'crypto';
import { IssueTokenType } from './types/jwtToken.type';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
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
import { Loggable } from '@lib/logger';

@Loggable()
@Injectable()
export class AuthService {
  private readonly adminJwtSecret: string;
  private readonly adminJwtExpire: StringValue;
  private readonly adminJwtAudience: string;
  private readonly adminJwtIssuer: string;
  private readonly adminRefreshTokenExpire: StringValue;
  private readonly userJwtSecret: string;
  private readonly userJwtExpire: StringValue;
  private readonly userJwtAudience: string;
  private readonly userJwtIssuer: string;
  private readonly userRefreshTokenExpire: StringValue;
  private readonly refreshTokenHmacSecret: string;

  constructor(
    private readonly infoteamIdpService: InfoteamIdpService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.adminJwtSecret =
      this.configService.getOrThrow<string>('ADMIN_JWT_SECRET');
    this.adminJwtExpire =
      this.configService.getOrThrow<StringValue>('ADMIN_JWT_EXPIRE');
    this.adminJwtAudience =
      this.configService.getOrThrow<string>('ADMIN_JWT_AUDIENCE');
    this.adminJwtIssuer =
      this.configService.getOrThrow<string>('ADMIN_JWT_ISSUER');
    this.adminRefreshTokenExpire = this.configService.getOrThrow<StringValue>(
      'ADMIN_REFRESH_TOKEN_EXPIRE',
    );
    this.userJwtSecret =
      this.configService.getOrThrow<string>('USER_JWT_SECRET');
    this.userJwtExpire =
      this.configService.getOrThrow<StringValue>('USER_JWT_EXPIRE');
    this.userJwtAudience =
      this.configService.getOrThrow<string>('USER_JWT_AUDIENCE');
    this.userJwtIssuer =
      this.configService.getOrThrow<string>('USER_JWT_ISSUER');
    this.userRefreshTokenExpire = this.configService.getOrThrow<StringValue>(
      'USER_REFRESH_TOKEN_EXPIRE',
    );
    this.refreshTokenHmacSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_HMAC_SECRET',
    );
  }

  async adminLogin(auth: string): Promise<IssueTokenType> {
    const idpToken = auth.split(' ')[1];
    const userinfo = await this.infoteamIdpService.getUserInfo(idpToken);
    await this.authRepository.findAdmin(userinfo.uuid);
    await this.authRepository.deleteAllAdminRefreshTokens(userinfo.uuid);
    const sessionId = this.generateSessionId();
    return await this.issueAdminTokens(userinfo.uuid, sessionId);
  }

  async findAdmin(uuid: string): Promise<Admin> {
    return this.authRepository.findAdmin(uuid);
  }

  async adminRefresh(refreshToken: string): Promise<IssueTokenType> {
    const hashedToken = this.hashRefreshToken(refreshToken);
    const { adminUuid, sessionId, expiredAt } =
      await this.authRepository.findAdminByRefreshToken(hashedToken);

    await this.authRepository.deleteAdminRefreshToken(hashedToken);

    const newRefreshToken = this.generateOpaqueToken();
    const newHashedToken = this.hashRefreshToken(newRefreshToken);
    await this.authRepository.setAdminRefreshToken(
      adminUuid,
      newHashedToken,
      sessionId,
      expiredAt,
    );

    return {
      access_token: this.jwtService.sign(
        { sessionId },
        {
          subject: adminUuid,
          secret: this.adminJwtSecret,
          expiresIn: this.adminJwtExpire,
          algorithm: 'HS256',
          audience: this.adminJwtAudience,
          issuer: this.adminJwtIssuer,
        },
      ),
      refresh_token: newRefreshToken,
      refreshTokenExpiredAt: expiredAt,
    };
  }

  async adminLogout(adminUuid: string): Promise<void> {
    await this.authRepository.deleteAllAdminRefreshTokens(adminUuid);
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

    const { refreshToken, sessionId, expiredAt } =
      await this.prismaService.$transaction(async (tx: PrismaTransaction) => {
        const user = await this.authRepository.upsertUserInTx(userinfo, tx);

        await this.validateAndHandleConsentsInTransaction(
          user,
          consentData,
          tx,
        );

        await this.authRepository.deleteAllUserRefreshTokensInTx(user.uuid, tx);

        const token = this.generateOpaqueToken();
        const sessionId = this.generateSessionId();
        const hashedToken = this.hashRefreshToken(token);
        const expiredAt = new Date(
          Date.now() + ms(this.userRefreshTokenExpire),
        );
        await this.authRepository.setUserRefreshTokenInTx(
          user.uuid,
          hashedToken,
          sessionId,
          expiredAt,
          tx,
        );

        return { refreshToken: token, sessionId, expiredAt };
      });

    const accessToken = this.jwtService.sign(
      { sessionId },
      {
        subject: userinfo.uuid,
        secret: this.userJwtSecret,
        expiresIn: this.userJwtExpire,
        algorithm: 'HS256',
        audience: this.userJwtAudience,
        issuer: this.userJwtIssuer,
      },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      refreshTokenExpiredAt: expiredAt,
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
        user.uuid,
        ConsentType.TERMS_OF_SERVICE,
        tx,
      ),
      this.authRepository.getLatestUserConsentInTx(
        user.uuid,
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
        user.uuid,
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
    return crypto
      .createHmac('sha256', this.refreshTokenHmacSecret)
      .update(token)
      .digest('hex');
  }

  private async issueAdminTokens(
    uuid: string,
    sessionId: string,
  ): Promise<IssueTokenType> {
    const refresh_token: string = this.generateOpaqueToken();
    const hashedToken = this.hashRefreshToken(refresh_token);
    const expiredAt = new Date(Date.now() + ms(this.adminRefreshTokenExpire));
    await this.authRepository.setAdminRefreshToken(
      uuid,
      hashedToken,
      sessionId,
      expiredAt,
    );
    return {
      access_token: this.jwtService.sign(
        { sessionId },
        {
          subject: uuid,
          secret: this.adminJwtSecret,
          expiresIn: this.adminJwtExpire,
          algorithm: 'HS256',
          audience: this.adminJwtAudience,
          issuer: this.adminJwtIssuer,
        },
      ),
      refresh_token,
      refreshTokenExpiredAt: expiredAt,
    };
  }

  async findUser(uuid: string): Promise<User> {
    return this.authRepository.findUser(uuid);
  }

  async findAdminRefreshTokenBySessionId(adminUuid: string, sessionId: string) {
    return this.authRepository.findAdminRefreshTokenBySessionId(
      adminUuid,
      sessionId,
    );
  }

  async findUserRefreshTokenBySessionId(userUuid: string, sessionId: string) {
    return this.authRepository.findUserRefreshTokenBySessionId(
      userUuid,
      sessionId,
    );
  }

  async userRefresh(refreshToken: string): Promise<IssueTokenType> {
    const hashedToken = this.hashRefreshToken(refreshToken);
    const { userUuid, sessionId, expiredAt } =
      await this.authRepository.findUserByRefreshToken(hashedToken);

    await this.authRepository.deleteUserRefreshToken(hashedToken);

    const newRefreshToken = this.generateOpaqueToken();
    const newHashedToken = this.hashRefreshToken(newRefreshToken);
    await this.authRepository.setUserRefreshToken(
      userUuid,
      newHashedToken,
      sessionId,
      expiredAt,
    );
    return {
      access_token: this.jwtService.sign(
        { sessionId },
        {
          subject: userUuid,
          secret: this.userJwtSecret,
          expiresIn: this.userJwtExpire,
          algorithm: 'HS256',
          audience: this.userJwtAudience,
          issuer: this.userJwtIssuer,
        },
      ),
      refresh_token: newRefreshToken,
      refreshTokenExpiredAt: expiredAt,
    };
  }

  async userLogout(userUuid: string): Promise<void> {
    await this.authRepository.deleteAllUserRefreshTokens(userUuid);
  }

  async createNewPolicyVersion({
    type,
    version,
  }: CreateNewPolicyDto): Promise<CreateNewPolicyResponseDto> {
    return await this.authRepository.createNewPolicyVersion({ type, version });
  }
}
