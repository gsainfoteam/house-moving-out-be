import { Injectable } from '@nestjs/common';
import { Loggable } from '@lib/logger';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Loggable()
@Injectable()
export class FileService {
  private readonly s3Client: S3Client;
  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: configService.getOrThrow('AWS_S3_REGION'),
      credentials: {
        accessKeyId: configService.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async getUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET'),
      Key: key,
    });
    const expiresIn = 60 * 60; // 1 hour
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async createPresignedUrl(key: string, length: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.configService.getOrThrow<string>('AWS_S3_BUCKET'),
      Key: key,
      ContentLength: length,
    });
    const expiresIn = 5 * 60; // 5 minutes
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
