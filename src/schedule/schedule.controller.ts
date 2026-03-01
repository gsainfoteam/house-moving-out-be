import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  ParseUUIDPipe,
  Param,
  Post,
  Put,
  Patch,
  HttpCode,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from 'generated/prisma/client';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { UserGuard } from 'src/auth/guard/user.guard';
import { ErrorDto } from 'src/common/dto/error.dto';
import { InspectorResDto } from 'src/inspector/dto/res/inspector-res.dto';
import { MoveOutScheduleWithSlotsResDto } from './dto/res/move-out-schedule-with-slots-res.dto';
import { MoveOutScheduleResDto } from './dto/res/move-out-schedule-res.dto';
import { ScheduleService } from './schedule.service';
import { CreateMoveOutScheduleWithTargetsDto } from './dto/req/create-move-out-schedule-with-targets.dto';
import { UpdateInspectionTargetsDto } from './dto/req/update-inspection-targets.dto';
import { UpdateInspectionTargetsResDto } from './dto/res/update-inspection-targets-res.dto';
import { InspectionTargetsGroupedByRoomResDto } from './dto/res/find-all-inspection-target-infos-res.dto';
import { BulkUpdateCleaningServiceDto } from './dto/req/bulk-update-cleaning-service.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @ApiOperation({
    summary: 'Get All Move Out Schedules',
    description: 'Retrieve all move out schedules.',
  })
  @ApiOkResponse({
    description: 'The move out schedules have been successfully retrieved.',
    type: [MoveOutScheduleResDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get()
  async findAllMoveOutSchedules(): Promise<MoveOutScheduleResDto[]> {
    return await this.scheduleService.findAllMoveOutSchedules();
  }

  @ApiOperation({
    summary: 'Create Move Out Schedule with Targets',
    description:
      'Create a new move out schedule, inspection targets and slots in a single transaction.',
  })
  @ApiCreatedResponse({
    description:
      'The move out schedule, inspection targets and slots have been successfully created.',
    type: MoveOutScheduleResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiConflictResponse({ description: 'Conflict' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateMoveOutScheduleWithTargetsDto })
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @Post()
  async createMoveOutScheduleWithTargets(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    createMoveOutScheduleWithTargetsDto: CreateMoveOutScheduleWithTargetsDto,
  ): Promise<MoveOutScheduleResDto> {
    return await this.scheduleService.createMoveOutScheduleWithTargets(
      file,
      createMoveOutScheduleWithTargetsDto,
    );
  }

  @ApiOperation({
    summary: 'Get Active Move Out Schedule with Slots',
    description:
      'Retrieve an active move out schedule including its inspection slots.',
  })
  @ApiOkResponse({
    description:
      'The move out schedule with slots has been successfully retrieved.',
    type: MoveOutScheduleWithSlotsResDto,
  })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('active')
  async findActiveMoveOutScheduleWithSlots(
    @GetUser() user: User,
  ): Promise<MoveOutScheduleWithSlotsResDto> {
    return await this.scheduleService.findActiveMoveOutScheduleWithSlots(user);
  }

  @ApiOperation({
    summary: 'Get Move Out Schedule with Slots',
    description:
      'Retrieve a specific move out schedule including its inspection slots by UUID.',
  })
  @ApiOkResponse({
    description:
      'The move out schedule with slots has been successfully retrieved.',
    type: MoveOutScheduleWithSlotsResDto,
  })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get(':uuid')
  async findMoveOutScheduleWithSlots(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<MoveOutScheduleWithSlotsResDto> {
    return await this.scheduleService.findMoveOutScheduleWithSlots(uuid);
  }

  @ApiOperation({
    summary: 'Get Inspectors using schedule uuid',
    description:
      'Get available inspectors for a move out schedule using schedule UUID.',
  })
  @ApiOkResponse({
    description: 'The available inspectors has been successfully retrieved.',
    type: [InspectorResDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get(':uuid/inspector')
  async findInspectorsByScheduleUuid(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<InspectorResDto[]> {
    return await this.scheduleService.findInspectorsByScheduleUuid(uuid);
  }

  @ApiOperation({
    summary: 'Replace Inspection Targets and Update Slot Capacities',
    description:
      'Upload Excel (2 sheets: current/next semester). Replaces inspection targets for the given schedule and recalculates all slot capacities. Allowed only before the schedule application period has started.',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - Application period has already started; target replacement not allowed',
  })
  @ApiOkResponse({
    description: 'Inspection targets replaced and slot capacities updated',
    type: UpdateInspectionTargetsResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateInspectionTargetsDto })
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @Put(':uuid/targets')
  async updateInspectionTargets(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UpdateInspectionTargetsResDto> {
    return await this.scheduleService.updateInspectionTargetsAndUpdateSlotCapacities(
      file,
      uuid,
    );
  }

  @ApiOperation({
    summary: 'Get Inspection Targets by Schedule Uuid',
    description: 'Retrieve inspection targets by Inspection Schedule Uuid',
  })
  @ApiOkResponse({
    description: 'Inspection targets successfully retrieved',
    type: [InspectionTargetsGroupedByRoomResDto],
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get(':uuid/targets')
  async findAllInspectionTargetInfos(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
  ): Promise<InspectionTargetsGroupedByRoomResDto[]> {
    return await this.scheduleService.findAllInspectionTargetInfoByScheduleUuid(
      scheduleUuid,
    );
  }

  @ApiOperation({
    summary: 'Bulk update cleaning service for inspection targets',
    description:
      'Bulk update the external cleaning service application flag for multiple inspection targets within a single schedule. Allowed only when the schedule status is DRAFT.',
  })
  @ApiNoContentResponse({
    description: 'Cleaning service flags successfully updated',
  })
  @ApiBadRequestResponse({
    description: 'One or more inspection target UUIDs are invalid',
  })
  @ApiForbiddenResponse({
    description:
      'Cleaning service flags can be modified only when the schedule status is DRAFT',
  })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch(':uuid/targets/cleaning-service')
  @HttpCode(204)
  async bulkUpdateCleaningService(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
    @Body() dto: BulkUpdateCleaningServiceDto,
  ): Promise<void> {
    await this.scheduleService.bulkUpdateCleaningService(scheduleUuid, dto);
  }
}
