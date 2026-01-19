import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@lib/prisma';
import { Prisma } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { InspectorWithSlots } from './types/inspector-with-slots.type';
import { PrismaTransaction } from 'src/common/types';

@Injectable()
export class InspectorRepository {
  private readonly logger = new Logger(InspectorRepository.name);
  constructor(private readonly prismaService: PrismaService) {}

  async findAllInspectors(): Promise<InspectorWithSlots[]> {
    return await this.prismaService.inspector
      .findMany({
        include: {
          availableSlots: {
            include: {
              inspectionSlot: true,
            },
          },
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(`findAllInspectors prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`findAllInspectors error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async createInspectorsInTx(
    inspector: Prisma.InspectorCreateInput,
    tx: PrismaTransaction,
  ) {
    return await tx.inspector.create({ data: inspector }).catch((error) => {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          this.logger.debug(`Conflict email: ${error.message}`);
          throw new ConflictException('Conflict Error');
        }
        if (error.code === 'P2025') {
          this.logger.debug(`Inspection slot not found: ${error.message}`);
          throw new NotFoundException(`Inspection slot not found`);
        }
        this.logger.error(`createInspectors prisma error: ${error.message}`);
        throw new InternalServerErrorException('Database Error');
      }
      this.logger.error(`createInspectors error: ${error}`);
      throw new InternalServerErrorException('Unknown Error');
    });
  }

  async connectInspectorAndSlotsInTx(
    inspectorUuid: string,
    inspectionSlotIds: number[],
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.inspectorAvailableSlot
      .createMany({
        data: inspectionSlotIds.map((inspectionSlotId) => ({
          inspectorUuid,
          inspectionSlotId,
        })),
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            this.logger.debug(`Conflict email: ${error.message}`);
            throw new ConflictException('Conflict Error');
          }
          if (error.code === 'P2025') {
            this.logger.debug(`Inspection slot not found: ${error.message}`);
            throw new NotFoundException(`Inspection slot not found`);
          }
          this.logger.error(`createInspectors prisma error: ${error.message}`);
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`createInspectors error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }

  async findInspector(uuid: string): Promise<InspectorWithSlots> {
    return await this.prismaService.inspector
      .findUniqueOrThrow({
        where: { uuid },
        include: {
          availableSlots: {
            include: {
              inspectionSlot: true,
            },
          },
        },
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

  async deleteInspectorAvailableSlotsInTx(
    inspectorUuid: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    await tx.inspectorAvailableSlot
      .deleteMany({
        where: { inspectorUuid },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          this.logger.error(
            `deleteInspectorAvailableSlotsInTx prisma error: ${error.message}`,
          );
          throw new InternalServerErrorException('Database Error');
        }
        this.logger.error(`deleteInspectorAvailableSlotsInTx error: ${error}`);
        throw new InternalServerErrorException('Unknown Error');
      });
  }
}
