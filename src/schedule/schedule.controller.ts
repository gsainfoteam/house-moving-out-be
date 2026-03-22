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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
import {
  CreateMoveOutScheduleWithTargetsDto,
  CreateMoveOutScheduleWithTargetsFormDto,
} from './dto/req/create-move-out-schedule-with-targets.dto';
import {
  UpdateInspectionTargetsDto,
  UpdateInspectionTargetsFormDto,
} from './dto/req/update-inspection-targets.dto';
import { UpdateInspectionTargetsResDto } from './dto/res/update-inspection-targets-res.dto';
import { InspectionTargetsGroupedByRoomResDto } from './dto/res/find-all-inspection-target-infos-res.dto';
import { BulkUpdateCleaningServiceDto } from './dto/req/bulk-update-cleaning-service.dto';
import { ApplicationListResDto } from 'src/application/dto/res/application-res.dto';
import { ApplicationListQueryDto } from 'src/schedule/dto/req/application-list-query.dto';
import { EXCEL_VALIDATION_CONSTANTS } from '@lib/excel-parser/constants/room-assignment-parser.constants';
import { UpdateScheduleStatusDto } from './dto/req/update-schedule-status.dto';

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
  @ApiBody({ type: CreateMoveOutScheduleWithTargetsFormDto })
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'currentSemesterFile', maxCount: 1 },
        { name: 'nextSemesterFile', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: EXCEL_VALIDATION_CONSTANTS.MAX_FILE_SIZE,
        },
      },
    ),
  )
  @Post()
  async createMoveOutScheduleWithTargets(
    @UploadedFiles()
    files: {
      currentSemesterFile: Express.Multer.File[];
      nextSemesterFile: Express.Multer.File[];
    },
    @Body()
    createMoveOutScheduleWithTargetsDto: CreateMoveOutScheduleWithTargetsDto,
  ): Promise<MoveOutScheduleResDto> {
    return await this.scheduleService.createMoveOutScheduleWithTargets(
      files.currentSemesterFile?.[0],
      files.nextSemesterFile?.[0],
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
    summary: 'Update move out schedule status',
    description: 'Update the status of a specific move out schedule.',
  })
  @ApiOkResponse({
    description: 'Status updated successfully',
    type: MoveOutScheduleResDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch(':uuid/status')
  async updateStatus(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: UpdateScheduleStatusDto,
  ): Promise<void> {
    return await this.scheduleService.updateStatus(uuid, dto.status);
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
    summary: 'Get All Inspection Applications by Schedule Uuid',
    description:
      'Retrieve all inspection applications by Inspection Schedule Uuid',
  })
  @ApiOkResponse({
    description: 'Inspection applications successfully retrieved',
    type: ApplicationListResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get(':uuid/applications')
  async findAllInspectionApplications(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
    @Query() query: ApplicationListQueryDto,
  ): Promise<ApplicationListResDto> {
    return await this.scheduleService.findApplicationsByScheduleUuid(
      query,
      scheduleUuid,
    );
  }

  @ApiOperation({
    summary: 'Replace Inspection Targets and Update Slot Capacities',
    description:
      'Upload Excel files(2 files: current/next semester). Replaces inspection targets for the given schedule and recalculates all slot capacities. Allowed only before the schedule application period has started.',
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
  @ApiBody({ type: UpdateInspectionTargetsFormDto })
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'currentSemesterFile', maxCount: 1 },
        { name: 'nextSemesterFile', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: EXCEL_VALIDATION_CONSTANTS.MAX_FILE_SIZE,
        },
      },
    ),
  )
  @Put(':uuid/targets')
  async updateInspectionTargets(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @UploadedFiles()
    files: {
      currentSemesterFile: Express.Multer.File[];
      nextSemesterFile: Express.Multer.File[];
    },
    @Body() dto: UpdateInspectionTargetsDto,
  ): Promise<UpdateInspectionTargetsResDto> {
    return await this.scheduleService.updateInspectionTargetsAndUpdateSlotCapacities(
      files.currentSemesterFile?.[0],
      files.nextSemesterFile?.[0],
      dto.residentGenderByHouseFloorKey,
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

  @ApiOperation({
    summary: 'Download inspection documents',
    description: 'Download inspection documents by schedule UUID',
  })
  @ApiOkResponse({
    description: 'Inspection documents successfully downloaded',
  })
  @ApiBadRequestResponse({
    description: 'schedule UUID is wrong',
  })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get(':uuid/documents')
  async downloadInspectionDocuments(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
  ): Promise<StreamableFile> {
    return new StreamableFile(
      await this.scheduleService.downloadInspectionDocuments(scheduleUuid),
      {
        type: 'application/pdf',
        disposition: 'attachment',
      },
    );
  }
}
