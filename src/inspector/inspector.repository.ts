import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { Inspector, Prisma } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class InspectorRepository {
  private readonly logger = new Logger(InspectorRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async findAllInspectors(): Promise<Inspector[]> {
    return await this.prismaService.inspector.findMany().catch((error) => {
      if (error instanceof PrismaClientKnownRequestError) {
        this.logger.error(`findAllInspectors prisma error: ${error.message}`);
        throw new InternalServerErrorException('Database Error');
      }
      this.logger.error(`findAllInspectors error: ${error}`);
      throw new InternalServerErrorException('Unknown Error');
    });
  }

  async createInspectors(
    inspectors: Prisma.InspectorCreateManyInput[],
  ): Promise<void> {
    await this.prismaService.inspector
      .createMany({
        data: inspectors,
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            this.logger.debug(`Conflict email: ${error.message}`);
            throw new ConflictException('Conflict Error');
          }
          this.logger.error(`createInspectors prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectors error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspector(uuid: string): Promise<Inspector> {
    return await this.prismaService.inspector
      .findUniqueOrThrow({
        where: { uuid },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Inspector not found: ${uuid}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(`findInspector prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findInspector error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async updateInspector(
    uuid: string,
    availableTimes: Date[],
  ): Promise<Inspector> {
    return await this.prismaService.inspector
      .update({
        where: { uuid },
        data: {
          availableTimes,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Inspector not found: ${uuid}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(`updateInspector prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`updateInspector error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async deleteInspector(uuid: string): Promise<void> {
    await this.prismaService.inspector
      .delete({
        where: { uuid },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2025') {
            this.logger.debug(`Inspector not found: ${uuid}`);
            throw new NotFoundException(`Not Found Error`);
          }
          this.logger.error(`deleteInspector prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteInspector error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
