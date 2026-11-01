import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConsentType, User } from 'generated/prisma/client';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConsentRequiredException } from './exceptions/consent-required.exception';
import {
  UserConsent,
  ConsentRequirement,
  ConsentData,
  ValidatedConsentData,
  LatestPolicyVersionResponse,
  LatestPolicyVersions,
} from './types/consent.type';
import {
  DatabaseService,
  UserRepository,
  UserConsentRepository,
  PrismaTransaction,
} from '@lib/database';
import { Loggable } from '@lib/logger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, TimeoutError, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { AxiosError } from 'axios';
import { UserLoginDto } from './dto/req/user-login.dto';
import type { IdpUser } from './account';

@Loggable()
@Injectable()
export class AuthService {
  private readonly policyApiUrl: string;
  private readonly ServiceNameForPolicyVersion: string;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly httpService: HttpService,
    private readonly userRepository: UserRepository,
    private readonly userConsentRepository: UserConsentRepository,
  ) {
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

  async resolveSession(
    idpUser: IdpUser,
    body: Record<string, unknown>,
  ): Promise<{ subject: string }> {
    if (!idpUser.isPhoneNumberVerified) {
      throw new UnauthorizedException('Phone number not verified');
    }
    if (!idpUser.isStudentIdVerified) {
      throw new UnauthorizedException('Student ID not verified');
    }

    const consentData = await this.parseConsentData(body);
    const latestPolicyVersions = await this.getLatestPolicyVersions();

    const user = await this.databaseService.$transaction(
      async (tx: PrismaTransaction) => {
        const user = await this.userRepository.upsertUserInTx(
          {
            name: idpUser.name,
            email: idpUser.email,
            studentNumber: idpUser.studentId,
            phoneNumber: idpUser.phoneNumber,
          },
          tx,
        );

        await this.validateAndHandleConsentsInTransaction(
          user,
          consentData,
          latestPolicyVersions,
          tx,
        );

        return user;
      },
    );

    return { subject: user.uuid };
  }

  private async parseConsentData(
    body: Record<string, unknown>,
  ): Promise<ConsentData> {
    const dto = plainToInstance(UserLoginDto, body);
    const errors = await validate(dto, { whitelist: true });
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.flatMap((error) => Object.values(error.constraints ?? {})),
      );
    }

    return {
      agreedToTerms: dto.agreedToTerms,
      agreedToPrivacy: dto.agreedToPrivacy,
      termsVersion: dto.termsVersion,
      privacyVersion: dto.privacyVersion,
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
        this.userConsentRepository.getLatestUserConsentInTx(
          user.uuid,
          ConsentType.TERMS_OF_SERVICE,
          tx,
        ),
        this.userConsentRepository.getLatestUserConsentInTx(
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
        {
          terms: {
            currentVersion: termsRequirement.currentVersion,
            requiredVersion: termsRequirement.requiredVersion,
          },
          privacy: {
            currentVersion: privacyRequirement.currentVersion,
            requiredVersion: privacyRequirement.requiredVersion,
          },
        },
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

      throw new ConsentRequiredException(errorMessage, errorCode, {
        terms: {
          currentVersion: termsRequirement.currentVersion,
          requiredVersion: termsRequirement.requiredVersion,
        },
        privacy: {
          currentVersion: privacyRequirement.currentVersion,
          requiredVersion: privacyRequirement.requiredVersion,
        },
      });
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
      await this.userConsentRepository.createUserConsentsInTx(
        user.uuid,
        consentsToCreate,
        tx,
      );
    }
  }
}
