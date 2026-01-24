import { InfoteamIdpService } from '@lib/infoteam-idp';
import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { Admin, ConsentType, User } from 'generated/prisma/client';
import * as crypto from 'crypto';
import { IssueTokenType } from './types/jwt-token.type';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { ConsentRequiredException } from './exceptions/consent-required.exception';
import {
  UserConsent,
  ConsentRequirement,
  ConsentData,
  ValidatedConsentData,
  LatestPolicyVersionResponse,
  LatestPolicyVersions,
} from './types/consent.type';
import { PrismaTransaction } from '../common/types';
import { PrismaService } from '@lib/prisma';
import { Loggable } from '@lib/logger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, TimeoutError, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { UserLoginDto } from './dto/req/user-login.dto';

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
  private readonly policyApiUrl: string;
  private readonly ServiceNameForPolicyVersion: string;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly infoteamIdpService: InfoteamIdpService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
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
    this.policyApiUrl = this.configService.getOrThrow<string>('POLICY_API_URL');
    this.ServiceNameForPolicyVersion = this.configService.getOrThrow<string>(
      'SERVICE_NAME_FOR_POLICY_VERSION',
    );
  }

  private async getLatestPolicyVersions(): Promise<LatestPolicyVersions> {
    const { service, tos, privacy } = await firstValueFrom(
      this.httpService.get<LatestPolicyVersionResponse>(this.policyApiUrl).pipe(
        timeout(10_000),
        map((res) => res.data),
        catchError((err: unknown) => {
          if (err instanceof TimeoutError) {
            this.logger.error('Policy API timeout after 10000ms');
            return throwError(
              () => new InternalServerErrorException('Policy API timeout'),
            );
          }

          const axiosErr = err as AxiosError;
          this.logger.error(axiosErr?.message ?? 'Unknown error');
          return throwError(
            () =>
              new InternalServerErrorException(
                'Failed to fetch policy versions',
              ),
          );
        }),
      ),
    );

    if (service !== this.ServiceNameForPolicyVersion) {
      this.logger.error('Service name for policy version mismatch');
      throw new InternalServerErrorException(
        'Service name for policy version mismatch',
      );
    }

    if (!tos || !privacy) {
      this.logger.error('Missing required policy version fields');
      throw new InternalServerErrorException(
        'Missing required policy version fields',
      );
    }

    return {
      terms: tos,
      privacy: privacy,
    };
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

    const latestPolicyVersions = await this.getLatestPolicyVersions();

    const { refreshToken, sessionId, expiredAt } =
      await this.prismaService.$transaction(async (tx: PrismaTransaction) => {
        const user = await this.authRepository.upsertUserInTx(userinfo, tx);

        await this.validateAndHandleConsentsInTransaction(
          user,
          consentData,
          latestPolicyVersions,
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
    latestPolicyVersions: LatestPolicyVersions,
    tx: PrismaTransaction,
  ): Promise<void> {
    const [latestTermsUserConsent, latestPrivacyUserConsent] =
      await Promise.all([
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
      latestTermsUserConsent,
      latestPolicyVersions.terms,
    );
    const privacyRequirement = this.checkConsentRequirement(
      latestPrivacyUserConsent,
      latestPolicyVersions.privacy,
    );

    if (termsRequirement.needsConsent || privacyRequirement.needsConsent) {
      this.validateConsentData(
        consentData,
        termsRequirement,
        privacyRequirement,
      );

      await this.saveUserConsentsInTransaction(
        user,
        {
          termsVersion: consentData.termsVersion!,
          privacyVersion: consentData.privacyVersion!,
        },
        termsRequirement.needsConsent,
        privacyRequirement.needsConsent,
        tx,
      );
    }
  }

  private checkConsentRequirement(
    latestConsent: UserConsent | null,
    activePolicyVersion: string,
  ): ConsentRequirement {
    const needsConsent: boolean =
      !latestConsent || latestConsent.version !== activePolicyVersion;
    const hasNeverConsented: boolean = !latestConsent;

    return {
      needsConsent,
      hasNeverConsented,
      currentVersion: latestConsent?.version,
      requiredVersion: activePolicyVersion,
    };
  }

  private validateConsentData(
    {
      agreedToTerms,
      agreedToPrivacy,
      termsVersion,
      privacyVersion,
    }: ConsentData,
    termsRequirement: ConsentRequirement,
    privacyRequirement: ConsentRequirement,
  ): void {
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
      termsVersion !== termsRequirement.requiredVersion
    ) {
      versionErrors.terms = {
        currentVersion: termsRequirement.currentVersion,
        requiredVersion: termsRequirement.requiredVersion,
      };
    }

    if (
      privacyRequirement.needsConsent &&
      privacyVersion !== privacyRequirement.requiredVersion
    ) {
      versionErrors.privacy = {
        currentVersion: privacyRequirement.currentVersion,
        requiredVersion: privacyRequirement.requiredVersion,
      };
    }

    if (versionErrors.terms || versionErrors.privacy) {
      const errorCode = isFirstLogin
        ? 'CONSENT_REQUIRED'
        : 'CONSENT_UPDATE_REQUIRED';
      const errorMessage = isFirstLogin
        ? 'Invalid consent version for first login'
        : 'Invalid consent version for updated policy';

      throw new ConsentRequiredException(
        errorMessage,
        errorCode,
        versionErrors,
      );
    }
  }

  private async saveUserConsentsInTransaction(
    user: User,
    { termsVersion, privacyVersion }: ValidatedConsentData,
    needTermsConsent: boolean,
    needPrivacyConsent: boolean,
    tx: PrismaTransaction,
  ): Promise<void> {
    const consentsToCreate: Array<{
      consentType: ConsentType;
      version: string;
    }> = [];

    if (needTermsConsent) {
      consentsToCreate.push({
        consentType: ConsentType.TERMS_OF_SERVICE,
        version: termsVersion,
      });
    }

    if (needPrivacyConsent) {
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
}
