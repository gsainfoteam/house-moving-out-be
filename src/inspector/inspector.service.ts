import { Injectable } from '@nestjs/common';
import { InspectorRepository } from './inspector.repository';
import { CreateInspectorsDto } from './dto/req/create-inspectors.dto';
import { InspectorResDto } from './dto/res/inspector-res.dto';
import { UpdateInspectorDto } from './dto/req/update-inspector.dto';
import { PrismaService } from '@lib/prisma';
import { PrismaTransaction } from 'src/common/types';
import { Loggable } from '@lib/logger';

@Loggable()
@Injectable()
export class InspectorService {
  constructor(
    private readonly inspectorRepository: InspectorRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async getInspectors(): Promise<InspectorResDto[]> {
    const inspectors = await this.inspectorRepository.findAllInspectors();
    return inspectors.map((inspector) => new InspectorResDto(inspector));
  }

  async createInspectors({ inspectors }: CreateInspectorsDto): Promise<void> {
    await this.prismaService.$transaction(async (tx: PrismaTransaction) => {
      for (const { availableSlotIds, ...inspector } of inspectors) {
        const { uuid } = await this.inspectorRepository.createInspectorsInTx(
          inspector,
          tx,
        );
        await this.inspectorRepository.connectInspectorAndSlotsInTx(
          uuid,
          availableSlotIds,
          tx,
        );
      }
    });
  }

  async getInspector(uuid: string): Promise<InspectorResDto> {
    const inspector = await this.inspectorRepository.findInspector(uuid);
    return new InspectorResDto(inspector);
  }

  async updateInspector(
    uuid: string,
    { availableSlotIds }: UpdateInspectorDto,
  ): Promise<void> {
    await this.prismaService.$transaction(async (tx: PrismaTransaction) => {
      await this.inspectorRepository.deleteInspectorAvailableSlotsInTx(
        uuid,
        tx,
      );
      await this.inspectorRepository.connectInspectorAndSlotsInTx(
        uuid,
        availableSlotIds,
        tx,
      );
    });
  }

  async deleteInspector(uuid: string): Promise<void> {
    await this.inspectorRepository.deleteInspector(uuid);
  }
}
