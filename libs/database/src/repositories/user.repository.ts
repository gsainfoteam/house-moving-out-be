import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { EncryptionService } from '../encryption.service';
import { Prisma, Role, User } from 'generated/prisma/client';
import { PrismaTransaction } from '../types';
import { ENCRYPTION_PURPOSE } from '../constants/encryption.constants';

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
      .then(async (user) => await this.encryptionService.decryptUser(user))
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

  async findUserByNameAndStudentNumber(
    name: string,
    studentNumber: string,
  ): Promise<User> {
    const studentHash = this.encryptionService.hash(name, studentNumber);

    return await this.databaseService.user
      .findFirst({
        where: {
          studentHash,
          deletedAt: null,
        },
      })
      .then(async (user) => {
        if (!user) {
          this.logger.debug(
            `user not found by student hash: name=${name}, studentNumber=${studentNumber}`,
          );
          throw new NotFoundException('User not found');
        }
        return await this.encryptionService.decryptUser(user);
      })
      .catch((error) => {
        if (error instanceof NotFoundException) {
          throw error;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(
            `findUserByNameAndStudentNumber prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findUserByNameAndStudentNumber error: ${error}`);
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
    const [
      encryptedName,
      encryptedEmail,
      encryptedPhoneNumber,
      encryptedStudentNumber,
    ] = await Promise.all([
      this.encryptionService.encrypt(name, ENCRYPTION_PURPOSE.USER.NAME, uuid),
      this.encryptionService.encrypt(
        email,
        ENCRYPTION_PURPOSE.USER.EMAIL,
        uuid,
      ),
      this.encryptionService.encrypt(
        phoneNumber,
        ENCRYPTION_PURPOSE.USER.PHONE_NUMBER,
        uuid,
      ),
      this.encryptionService.encrypt(
        studentNumber,
        ENCRYPTION_PURPOSE.USER.STUDENT_NUMBER,
        uuid,
      ),
    ]);

    const studentHash = this.encryptionService.hash(name, studentNumber);

    return await tx.user
      .upsert({
        where: { uuid },
        create: {
          uuid,
          studentHash,
          name: encryptedName!,
          email: encryptedEmail!,
          phoneNumber: encryptedPhoneNumber!,
          studentNumber: encryptedStudentNumber!,
        },
        update: {
          name: encryptedName!,
          studentHash,
          email: encryptedEmail!,
          phoneNumber: encryptedPhoneNumber!,
          studentNumber: encryptedStudentNumber!,
        },
      })
      .then(async (user) => await this.encryptionService.decryptUser(user))

      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`upsertUserInTx prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`upsertUserInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateUserRole(userUuid: string, role: Role): Promise<void> {
    await this.databaseService.user
      .update({
        where: { uuid: userUuid },
        data: { role },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`user not found: ${userUuid}`);
            throw new NotFoundException('User not found');
          }
          this.logger.error(`updateUserRole prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateUserRole error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateUserRoleInTx(
    userUuid: string,
    role: Role,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.user
      .update({
        where: { uuid: userUuid },
        data: { role },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`user not found: ${userUuid}`);
            throw new NotFoundException('User not found');
          }
          this.logger.error(
            `updateUserRoleInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateUserRoleInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findActiveAdmins(): Promise<User[]> {
    return await this.databaseService.user
      .findMany({
        where: {
          deletedAt: null,
          role: { in: [Role.ADMIN, Role.SUPERADMIN] },
        },
        orderBy: { createdAt: 'asc' },
      })
      .then(async (users) =>
        Promise.all(users.map((u) => this.encryptionService.decryptUser(u))),
      )
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`findActiveAdmins prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findActiveAdmins error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  /**
   * Lock the current active SUPERADMIN row (if any) within a transaction.
   * This uses raw SQL to ensure the row is locked with FOR UPDATE.
   */
  async lockActiveSuperAdminUuidInTx(
    tx: PrismaTransaction,
  ): Promise<string | null> {
    const rows = await tx.$queryRaw<Array<{ uuid: string }>>`
      SELECT uuid
      FROM "user"
      WHERE "deleted_at" IS NULL AND "role" = 'SUPERADMIN'
      FOR UPDATE
    `;
    return rows[0]?.uuid ?? null;
  }
}
