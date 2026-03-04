import { Loggable } from '@lib/logger';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { Prisma, User } from 'generated/prisma/client';
import { PrismaTransaction } from 'src/common/types';

@Loggable()
@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async findUser(uuid: string): Promise<User> {
    return await this.prismaService.user
      .findFirstOrThrow({
        where: {
          uuid,
          deletedAt: null,
        },
      })
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
    return await tx.user
      .upsert({
        where: { uuid },
        create: {
          uuid,
          name,
          email,
          phoneNumber,
          studentNumber,
        },
        update: {
          name,
          email,
          phoneNumber,
          studentNumber,
        },
      })
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
