import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from 'generated/prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { UserGuard } from 'src/auth/guard/user.guard';
import { InspectorService } from './inspector.service';
import { CreateInspectorsDto } from './dto/req/create-inspectors.dto';
import { InspectorResDto } from './dto/res/inspector-res.dto';
import { UpdateInspectorDto } from './dto/req/update-inspector.dto';
import { InspectorTargetsResDto } from 'src/inspector/dto/res/inspector-targets-res.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('inspector')
export class InspectorController {
  constructor(private readonly inspectorService: InspectorService) {}

  @ApiOperation({
    summary: 'Get All Inspectors',
    description: 'Get a list of all inspectors.',
  })
  @ApiOkResponse({
    description: 'List of Inspectors',
    type: [InspectorResDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get()
  async getInspectors(): Promise<InspectorResDto[]> {
    return await this.inspectorService.getInspectors();
  }

  @ApiOperation({
    summary: 'Get My Inspection Targets (Inspector)',
    description:
      'Get inspection targets assigned to the inspector in the active schedule',
  })
  @ApiOkResponse({
    description: 'The inspection targets have been successfully retrieved.',
    type: InspectorTargetsResDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - User is not an inspector',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('targets')
  async getMyInspectionTargets(
    @GetUser() user: User,
  ): Promise<InspectorTargetsResDto> {
    return await this.inspectorService.getMyInspectionTargets(user);
  }

  @ApiOperation({
    summary: 'Register Inspectors',
    description: 'Register Inspectors in bulk.',
  })
  @ApiCreatedResponse({
    description: 'Success',
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiConflictResponse({ description: 'Conflict' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Post()
  async createInspectors(@Body() dto: CreateInspectorsDto): Promise<void> {
    return await this.inspectorService.createInspectors(dto);
  }

  @ApiOperation({
    summary: 'Get a Inspectors',
    description: 'Get an inspector by ID.',
  })
  @ApiOkResponse({
    description: 'Inspector Information',
    type: InspectorResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get(':id')
  async getInspector(
    @Param('id', ParseUUIDPipe) uuid: string,
  ): Promise<InspectorResDto> {
    return await this.inspectorService.getInspector(uuid);
  }

  @ApiOperation({
    summary: 'Update Inspector',
    description: 'Update an inspection time of inspector by ID.',
  })
  @ApiOkResponse({
    description: 'Inspector information has been successfully updated.',
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch(':id')
  async updateInspector(
    @Param('id', ParseUUIDPipe) uuid: string,
    @Body() updateInspectorDto: UpdateInspectorDto,
  ): Promise<void> {
    return await this.inspectorService.updateInspector(
      uuid,
      updateInspectorDto,
    );
  }

  @ApiOperation({
    summary: 'Delete Inspector',
    description: 'Delete an inspector by ID.',
  })
  @ApiOkResponse({
    description: 'Deleted Successfully',
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Delete(':id')
  async deleteInspector(
    @Param('id', ParseUUIDPipe) uuid: string,
  ): Promise<void> {
    return await this.inspectorService.deleteInspector(uuid);
  }
}
