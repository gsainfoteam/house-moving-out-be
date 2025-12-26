import { PrismaService } from '@lib/prisma';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Admin } from 'generated/prisma/client';

@Injectable()
export class AdminRepository {
  private readonly logger = new Logger(AdminRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async findAdmin(uuid: string): Promise<Admin> {
    return await this.prismaService.admin
      .findUniqueOrThrow({
        where: {
          uuid,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`admin not found: ${uuid}`);
            throw new UnauthorizedException();
          }
          this.logger.error(`findAdmin prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAdmin error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
