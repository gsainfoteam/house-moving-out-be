import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { User, Inspector, InspectionTargetInfo } from 'generated/prisma/client';
import {
  ENCRYPTION_PURPOSE,
  EncryptionPurpose,
} from './constants/encryption.constants';

interface EncryptionSecrets {
  ENCRYPTION_PEPPER: string;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private pepper!: string;
  private isInitialized = false;
  private readonly secretName: string;
  private readonly awsRegion: string;
  private readonly kmsKeyId: string;
  private readonly secretsManager: SecretsManagerClient;
  private readonly kmsClient: KMSClient;

  constructor(private readonly configService: ConfigService) {
    this.secretName = this.configService.getOrThrow<string>(
      'AWS_SECRET_MANAGER_NAME',
    );
    this.awsRegion = this.configService.getOrThrow<string>('AWS_REGION');
    this.kmsKeyId = this.configService.getOrThrow<string>('AWS_KMS_KEY_ID');
    this.secretsManager = new SecretsManagerClient({
      region: this.awsRegion,
    });
    this.kmsClient = new KMSClient({ region: this.awsRegion });
  }

  async onModuleInit() {
    try {
      const response = await this.secretsManager.send(
        new GetSecretValueCommand({ SecretId: this.secretName }),
      );

      if (!response.SecretString) throw new Error('SecretString is empty');

      const secrets = JSON.parse(response.SecretString) as EncryptionSecrets;
      if (!secrets.ENCRYPTION_PEPPER) {
        throw new Error('Secret must contain ENCRYPTION_PEPPER');
      }
      this.pepper = secrets.ENCRYPTION_PEPPER;
      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Failed to load encryption secrets from AWS:', error);
      throw new InternalServerErrorException(
        'Failed to initialize encryption service',
      );
    }
  }

  private ensureInitialized() {
    if (!this.isInitialized) {
      throw new InternalServerErrorException(
        'EncryptionService is not initialized',
      );
    }
  }

  async encrypt(
    text: string | null | undefined,
    purpose: EncryptionPurpose,
    uuid: string,
  ): Promise<string | null> {
    if (!text) return text as null;
    this.ensureInitialized();

    try {
      const command = new EncryptCommand({
        KeyId: this.kmsKeyId,
        Plaintext: Buffer.from(text, 'utf8'),
        EncryptionContext: {
          purpose,
          uuid,
        },
      });

      const response = await this.kmsClient.send(command);
      if (!response.CiphertextBlob) {
        throw new Error('KMS encryption failed: No CiphertextBlob returned');
      }

      return Buffer.from(response.CiphertextBlob).toString('base64');
    } catch (error) {
      this.logger.error('KMS encryption failed:', error);
      throw new InternalServerErrorException('Encryption failed');
    }
  }

  async decrypt(
    encryptedData: string | null | undefined,
    purpose: EncryptionPurpose,
    uuid: string,
  ): Promise<string | null> {
    if (!encryptedData) return encryptedData as null;
    this.ensureInitialized();

    try {
      const command = new DecryptCommand({
        KeyId: this.kmsKeyId,
        CiphertextBlob: Buffer.from(encryptedData, 'base64'),
        EncryptionContext: {
          purpose,
          uuid,
        },
      });

      const response = await this.kmsClient.send(command);
      if (!response.Plaintext) {
        throw new Error('KMS decryption failed: No Plaintext returned');
      }

      return Buffer.from(response.Plaintext).toString('utf8');
    } catch (error) {
      this.logger.error('KMS decryption failed:', error);
      throw new InternalServerErrorException(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  hash(name: string, studentNumber: string): string {
    this.ensureInitialized();

    return crypto
      .createHmac('sha256', this.pepper)
      .update(`${name.toLowerCase().trim()}:${studentNumber}`)
      .digest('hex');
  }

  async decryptUser(user: User): Promise<User> {
    if (!user) return user;
    const [name, email, phoneNumber, studentNumber] = await Promise.all([
      this.decrypt(user.name, ENCRYPTION_PURPOSE.USER.NAME, user.uuid),
      this.decrypt(user.email, ENCRYPTION_PURPOSE.USER.EMAIL, user.uuid),
      this.decrypt(
        user.phoneNumber,
        ENCRYPTION_PURPOSE.USER.PHONE_NUMBER,
        user.uuid,
      ),
      this.decrypt(
        user.studentNumber,
        ENCRYPTION_PURPOSE.USER.STUDENT_NUMBER,
        user.uuid,
      ),
    ]);
    return {
      ...user,
      name: name!,
      email: email!,
      phoneNumber: phoneNumber!,
      studentNumber: studentNumber!,
    };
  }

  async decryptInspector(inspector: Inspector): Promise<Inspector> {
    if (!inspector) return inspector;
    const [name, email, studentNumber] = await Promise.all([
      this.decrypt(
        inspector.name,
        ENCRYPTION_PURPOSE.INSPECTOR.NAME,
        inspector.uuid,
      ),
      this.decrypt(
        inspector.email,
        ENCRYPTION_PURPOSE.INSPECTOR.EMAIL,
        inspector.uuid,
      ),
      this.decrypt(
        inspector.studentNumber,
        ENCRYPTION_PURPOSE.INSPECTOR.STUDENT_NUMBER,
        inspector.uuid,
      ),
    ]);
    return {
      ...inspector,
      name: name!,
      email: email!,
      studentNumber: studentNumber!,
    };
  }

  async decryptTarget(
    target: InspectionTargetInfo,
  ): Promise<InspectionTargetInfo> {
    if (!target) return target;
    const [
      student1Name,
      student1StudentNumber,
      student2Name,
      student2StudentNumber,
      student3Name,
      student3StudentNumber,
    ] = await Promise.all([
      this.decrypt(
        target.student1Name,
        ENCRYPTION_PURPOSE.TARGET.NAME,
        target.uuid,
      ),
      this.decrypt(
        target.student1StudentNumber,
        ENCRYPTION_PURPOSE.TARGET.STUDENT_NUMBER,
        target.uuid,
      ),
      this.decrypt(
        target.student2Name,
        ENCRYPTION_PURPOSE.TARGET.NAME,
        target.uuid,
      ),
      this.decrypt(
        target.student2StudentNumber,
        ENCRYPTION_PURPOSE.TARGET.STUDENT_NUMBER,
        target.uuid,
      ),
      this.decrypt(
        target.student3Name,
        ENCRYPTION_PURPOSE.TARGET.NAME,
        target.uuid,
      ),
      this.decrypt(
        target.student3StudentNumber,
        ENCRYPTION_PURPOSE.TARGET.STUDENT_NUMBER,
        target.uuid,
      ),
    ]);
    return {
      ...target,
      student1Name,
      student1StudentNumber,
      student2Name,
      student2StudentNumber,
      student3Name,
      student3StudentNumber,
    };
  }
}
