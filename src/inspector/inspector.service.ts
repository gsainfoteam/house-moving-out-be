import { Injectable } from '@nestjs/common';
import { InspectorRepository } from './inspector.repository';
import { CreateInspectorsDto } from './dto/req/create-inspectors.dto';
import { InspectorResDto } from './dto/res/inspector-res.dto';
import { UpdateInspectorDto } from './dto/req/update-inspector.dto';

@Injectable()
export class InspectorService {
  constructor(private readonly inspectorRepository: InspectorRepository) {}

  async createInspectors({ inspectors }: CreateInspectorsDto): Promise<void> {
    await this.inspectorRepository.createInspectors(inspectors);
  }

  async getInspectors(): Promise<InspectorResDto[]> {
    return await this.inspectorRepository.findAllInspectors();
  }

  async updateInspector(
    uuid: string,
    { inspectionTimes }: UpdateInspectorDto,
  ): Promise<void> {
    await this.inspectorRepository.updateInspector(uuid, inspectionTimes);
  }

  async deleteInspector(uuid: string): Promise<void> {
    await this.inspectorRepository.deleteInspector(uuid);
  }
}
