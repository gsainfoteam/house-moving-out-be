import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { InspectorService } from './inspector.service';
import { CreateInspectorsDto } from './dto/req/create-inspectors.dto';
import { InspectorResDto } from './dto/res/inspector-res.dto';
import { UpdateInspectorDto } from './dto/req/update-inspector.dto';

@ApiTags('inspector')
@ApiBearerAuth('admin')
@UseGuards(AdminGuard)
@Controller('inspector')
export class InspectorController {
  constructor(private readonly inspectorService: InspectorService) {}

  @ApiOperation({
    summary: 'Register Inspectors',
    description: 'Register Inspectors in bulk.',
  })
  @ApiCreatedResponse({
    description: 'Success',
    type: Number,
  })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Post()
  async createInspectors(@Body() dto: CreateInspectorsDto): Promise<void> {
    return this.inspectorService.createInspectors(dto);
  }

  @ApiOperation({
    summary: '담당자 목록 조회',
    description: '모든 담당자 목록을 조회합니다.',
  })
  @ApiOkResponse({
    description: '담당자 목록이 성공적으로 조회되었습니다.',
    type: [InspectorResDto],
  })
  @Get()
  async getInspectors(): Promise<InspectorResDto[]> {
    return this.inspectorService.getInspectors();
  }

  @ApiOperation({
    summary: '담당자 정보 수정',
    description: '담당자의 정보를 수정합니다.',
  })
  @ApiOkResponse({
    description: '담당자 정보가 성공적으로 수정되었습니다.',
    type: InspectorResDto,
  })
  @Patch(':id')
  async updateInspector(
    @Param('id', ParseUUIDPipe) uuid: string,
    @Body() updateInspectorDto: UpdateInspectorDto,
  ): Promise<void> {
    return this.inspectorService.updateInspector(uuid, updateInspectorDto);
  }

  @ApiOperation({
    summary: 'Delete Inspector',
    description: 'Delete an inspector by ID.',
  })
  @ApiNoContentResponse({
    description: 'Deleted Successfully',
  })
  @Delete(':id')
  async deleteInspector(
    @Param('id', ParseUUIDPipe) uuid: string,
  ): Promise<void> {
    return this.inspectorService.deleteInspector(uuid);
  }
}
