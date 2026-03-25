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
  Query,
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
import { ErrorDto } from 'src/common/dto/error.dto';
import { AssignedTargetsResDto } from './dto/res/assigned-targets-res.dto';
import { InspectorQueryDto } from './dto/req/inspector-query.dto';

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
  async getInspectors(
    @Query() { scheduleUuid }: InspectorQueryDto,
  ): Promise<InspectorResDto[]> {
    return await this.inspectorService.getInspectors(scheduleUuid);
  }

  @ApiOperation({
    summary: 'Get My Assigned Inspection Targets (Inspector)',
    description:
      'Get inspection targets assigned to the inspector in the active schedule',
  })
  @ApiOkResponse({
    description: 'The inspection targets have been successfully retrieved.',
    type: [AssignedTargetsResDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - User is not an inspector',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - No active schedule or inspector not found',
    type: ErrorDto,
  })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('me/assigned-targets')
  async getMyAssignedTargets(
    @GetUser() user: User,
  ): Promise<AssignedTargetsResDto[]> {
    return await this.inspectorService.getMyAssignedTargets(user);
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
  async createInspectors(
    @Query() { scheduleUuid }: InspectorQueryDto,
    @Body() dto: CreateInspectorsDto,
  ): Promise<void> {
    return await this.inspectorService.createInspectors(scheduleUuid, dto);
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
  @Get(':uuid')
  async getInspector(
    @Param('uuid', ParseUUIDPipe) uuid: string,
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
  @Patch(':uuid')
  async updateInspector(
    @Query() { scheduleUuid }: InspectorQueryDto,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateInspectorDto,
  ): Promise<void> {
    return await this.inspectorService.updateInspector(scheduleUuid, uuid, dto);
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
  @Delete(':uuid')
  async deleteInspector(
    @Query() { scheduleUuid }: InspectorQueryDto,
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<void> {
    return await this.inspectorService.deleteInspector(scheduleUuid, uuid);
  }
}
