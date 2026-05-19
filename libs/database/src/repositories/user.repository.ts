import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { EncryptionService } from '../encryption.service';
import { Prisma, User } from 'generated/prisma/client';
import { PrismaTransaction } from '../types';

@Loggable()
@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findUser(uuid: string): Promise<User> {
    return await this.databaseService.user
      .findFirstOrThrow({
        where: {
          uuid,
          deletedAt: null,
        },
      })
      .then((user) => this.encryptionService.decryptUser(user))
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`user not found: ${uuid}`);
            throw new NotFoundException('User not found');
          }
          this.logger.error(`findUser prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findUser error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async upsertUserInTx(
    {
      uuid,
      name,
      email,
      phoneNumber,
      studentNumber,
    }: Pick<User, 'uuid' | 'name' | 'email' | 'phoneNumber' | 'studentNumber'>,
    tx: PrismaTransaction,
  ): Promise<User> {
    const encryptedName = this.encryptionService.encrypt(
      name,
      'user:name',
      uuid,
    )!;
    const encryptedEmail = this.encryptionService.encrypt(
      email,
      'user:email',
      uuid,
    )!;
    const encryptedPhoneNumber = this.encryptionService.encrypt(
      phoneNumber,
      'user:phoneNumber',
      uuid,
    )!;
    const encryptedStudentNumber = this.encryptionService.encrypt(
      studentNumber,
      'user:studentNumber',
      uuid,
    )!;
    const studentHash = this.encryptionService.hash(name, studentNumber);

    return await tx.user
      .upsert({
        where: { uuid },
        create: {
          uuid,
          studentHash,
          name: encryptedName,
          email: encryptedEmail,
          phoneNumber: encryptedPhoneNumber,
          studentNumber: encryptedStudentNumber,
        },
        update: {
          name: encryptedName,
          studentHash,
          email: encryptedEmail,
          phoneNumber: encryptedPhoneNumber,
          studentNumber: encryptedStudentNumber,
        },
      })
      .then((user) => this.encryptionService.decryptUser(user))
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`upsertUserInTx prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`upsertUserInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
