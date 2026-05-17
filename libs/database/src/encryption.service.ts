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
import { User, Inspector, InspectionTargetInfo } from 'generated/prisma/client';

interface EncryptionSecrets {
  ENCRYPTION_KEY: string;
  ENCRYPTION_PEPPER: string;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private key!: Buffer;
  private pepper!: string;
  private isInitialized = false;
  private readonly secretsManager: SecretsManagerClient;

  constructor(private readonly configService: ConfigService) {
    this.secretsManager = new SecretsManagerClient({
      region: this.configService.getOrThrow<string>('AWS_S3_REGION'),
    });
  }

  async onModuleInit() {
    await this.loadSecrets();
  }

  private async loadSecrets() {
    const secretName = this.configService.getOrThrow<string>(
      'AWS_SECRET_MANAGER_NAME',
    );

    try {
      const response = await this.secretsManager.send(
        new GetSecretValueCommand({ SecretId: secretName }),
      );

      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString) as EncryptionSecrets;
        if (!secrets.ENCRYPTION_KEY || !secrets.ENCRYPTION_PEPPER) {
          throw new Error(
            'Secret must contain ENCRYPTION_KEY and ENCRYPTION_PEPPER',
          );
        }
        this.key = Buffer.from(secrets.ENCRYPTION_KEY, 'hex');
        this.pepper = secrets.ENCRYPTION_PEPPER;
        this.isInitialized = true;
      }
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

  encrypt(text: string | null | undefined): string | null {
    if (!text) return text as null;
    this.ensureInitialized();

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();
    const result = Buffer.concat([iv, Buffer.from(encrypted, 'base64'), tag]);

    return result.toString('base64');
  }

  decrypt(encryptedData: string | null | undefined): string | null {
    if (!encryptedData) return encryptedData as null;
    this.ensureInitialized();

    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      if (buffer.length < 28) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = buffer.subarray(0, 12);
      const tag = buffer.subarray(buffer.length - 16);
      const ciphertext = buffer.subarray(12, buffer.length - 16);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(
        ciphertext.toString('base64'),
        'base64',
        'utf8',
      );
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  hash(text: string): string {
    this.ensureInitialized();

    return crypto
      .createHmac('sha256', this.pepper)
      .update(text.toLowerCase().trim())
      .digest('hex');
  }

  decryptUser(user: User): User {
    if (!user) return user;
    return {
      ...user,
      name: this.decrypt(user.name)!,
      email: this.decrypt(user.email)!,
      phoneNumber: this.decrypt(user.phoneNumber)!,
      studentNumber: this.decrypt(user.studentNumber)!,
    };
  }

  decryptInspector(inspector: Inspector): Inspector {
    if (!inspector) return inspector;
    return {
      ...inspector,
      name: this.decrypt(inspector.name)!,
      email: this.decrypt(inspector.email)!,
      studentNumber: this.decrypt(inspector.studentNumber)!,
    };
  }

  decryptTarget(target: InspectionTargetInfo): InspectionTargetInfo {
    if (!target) return target;
    return {
      ...target,
      student1Name: this.decrypt(target.student1Name),
      student1StudentNumber: this.decrypt(target.student1StudentNumber),
      student2Name: this.decrypt(target.student2Name),
      student2StudentNumber: this.decrypt(target.student2StudentNumber),
      student3Name: this.decrypt(target.student3Name),
      student3StudentNumber: this.decrypt(target.student3StudentNumber),
    };
  }
}
