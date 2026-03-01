import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Patch,
  Put,
  ParseUUIDPipe,
  HttpCode,
  Param,
  Post,
  Query,
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
import { ApplyInspectionDto } from './dto/req/apply-inspection.dto';
import { UpdateInspectionTargetsDto } from './dto/req/update-inspection-targets.dto';
import { UpdateInspectionTargetsResDto } from './dto/res/update-inspection-targets-res.dto';
import { MoveOutScheduleWithSlotsResDto } from './dto/res/move-out-schedule-with-slots-res.dto';
import { InspectionResDto } from './dto/res/inspection-res.dto';
import { ApplicationUuidResDto } from './dto/res/application-uuid-res.dto';
import { UpdateApplicationDto } from './dto/req/update-inspection.dto';
import { MoveOutScheduleResDto } from './dto/res/move-out-schedule-res.dto';
import { MoveOutService } from './move-out.service';
import { CreateMoveOutScheduleWithTargetsDto } from './dto/req/create-move-out-schedule-with-targets.dto';
import { SubmitInspectionResultDto } from './dto/req/submit-inspection-result.dto';
import { RegisterResultResDto } from './dto/res/register-result-res.dto';
import { ApplicationListQueryDto } from './dto/req/application-list-query.dto';
import {
  ApplicationListResDto,
  ApplicationResDto,
} from './dto/res/application-list-res.dto';
import { MyInspectionTypeResDto } from './dto/res/my-inspection-type-res.dto';
import { BulkUpdateCleaningServiceDto } from './dto/req/bulk-update-cleaning-service.dto';
import { InspectionTargetsGroupedByRoomResDto } from './dto/res/find-all-inspection-target-infos-res.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('move-out')
export class MoveOutController {
  constructor(private readonly moveOutService: MoveOutService) {}

  @ApiOperation({
    summary: 'Get All Move Out Schedules',
    description: 'Retrieve all move out schedules. [Moved to GET /schedule]',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The move out schedules have been successfully retrieved.',
    type: [MoveOutScheduleResDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get('schedule')
  async findAllMoveOutSchedules(): Promise<MoveOutScheduleResDto[]> {
    return await this.moveOutService.findAllMoveOutSchedules();
  }

  @ApiOperation({
    summary: 'Create Move Out Schedule with Targets',
    description:
      'Create a new move out schedule, inspection targets and slots in a single transaction. [Moved to POST /schedule]',
    deprecated: true,
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
  @Post('schedule')
  async createMoveOutScheduleWithTargets(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    createMoveOutScheduleWithTargetsDto: CreateMoveOutScheduleWithTargetsDto,
  ): Promise<MoveOutScheduleResDto> {
    return await this.moveOutService.createMoveOutScheduleWithTargets(
      file,
      createMoveOutScheduleWithTargetsDto,
    );
  }

  @ApiOperation({
    summary: 'Get Active Move Out Schedule with Slots',
    description:
      'Retrieve an active move out schedule including its inspection slots. [Moved to GET /schedule/active]',
    deprecated: true,
  })
  @ApiOkResponse({
    description:
      'The move out schedule with slots has been successfully retrieved.',
    type: MoveOutScheduleWithSlotsResDto,
  })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('schedule/active')
  async findActiveMoveOutScheduleWithSlots(
    @GetUser() user: User,
  ): Promise<MoveOutScheduleWithSlotsResDto> {
    return await this.moveOutService.findActiveMoveOutScheduleWithSlots(user);
  }

  /* @ApiOperation({
    summary: 'Update Move Out Schedule',
    description: 'Update an existing move out schedule by ID.',
  })
  @ApiOkResponse({
    description: 'The move out schedule has been successfully updated.',
    type: MoveOutScheduleResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch('schedule/:uuid')
  @UsePipes(
    new ValidationPipe({
      skipMissingProperties: true,
      transformOptions: {
        exposeUnsetFields: false,
      },
    }),
  )
  async updateMoveOutSchedule(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutScheduleResDto> {
    return await this.moveOutService.updateMoveOutSchedule(
      uuid,
      updateMoveOutScheduleDto,
    );
  } */

  @ApiOperation({
    summary: 'Get Move Out Schedule with Slots',
    description:
      'Retrieve a specific move out schedule including its inspection slots by UUID. [Moved to GET /schedule/:uuid]',
    deprecated: true,
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
  @Get('schedule/:uuid')
  async findMoveOutScheduleWithSlots(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<MoveOutScheduleWithSlotsResDto> {
    return await this.moveOutService.findMoveOutScheduleWithSlots(uuid);
  }

  @ApiOperation({
    summary: 'Get Inspectors using schedule uuid',
    description:
      'Get available inspectors for a move out schedule using schedule UUID. [Moved to GET /schedule/:uuid/inspector]',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The available inspectors has been successfully retrieved.',
    type: [InspectorResDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get('schedule/:uuid/inspector')
  async findInspectorsByScheduleUuid(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<InspectorResDto[]> {
    return await this.moveOutService.findInspectorsByScheduleUuid(uuid);
  }

  @ApiOperation({
    summary: 'Replace Inspection Targets and Update Slot Capacities',
    description:
      'Upload Excel (2 sheets: current/next semester). Replaces inspection targets for the given schedule and recalculates all slot capacities. Allowed only before the schedule application period has started. [Moved to PUT /schedule/:uuid/targets]',
    deprecated: true,
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
  @Put('schedule/:uuid/inspection-targets')
  async updateInspectionTargets(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UpdateInspectionTargetsResDto> {
    return await this.moveOutService.updateInspectionTargetsAndUpdateSlotCapacities(
      file,
      uuid,
    );
  }

  @ApiOperation({
    summary: 'Get Inspection Targets by Schedule Uuid',
    description:
      'Retrieve inspection targets by Inspection Schedule Uuid. [Moved to GET /schedule/:uuid/targets]',
    deprecated: true,
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
  @Get('schedule/:uuid/inspection-targets')
  async findAllInspectionTargetInfos(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
  ): Promise<InspectionTargetsGroupedByRoomResDto[]> {
    return await this.moveOutService.findAllInspectionTargetInfoByScheduleUuid(
      scheduleUuid,
    );
  }

  @ApiOperation({
    summary: 'Get All Inspection Applications by Schedule Uuid',
    description:
      'Retrieve all inspection applications by Inspection Schedule Uuid. [Moved to GET /application/schedule/:uuid]',
    deprecated: true,
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
  @Get('schedule/:uuid/applications')
  async findAllInspectionApplications(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
    @Query() query: ApplicationListQueryDto,
  ): Promise<ApplicationListResDto> {
    return await this.moveOutService.findApplicationsByScheduleUuid(
      query,
      scheduleUuid,
    );
  }

  @ApiOperation({
    summary: 'Bulk update cleaning service for inspection targets',
    description:
      'Bulk update the external cleaning service application flag for multiple inspection targets within a single schedule. Allowed only when the schedule status is DRAFT. [Moved to PATCH /schedule/:uuid/targets/cleaning-service]',
    deprecated: true,
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
  @Patch('schedule/:uuid/inspection-targets/cleaning-service')
  @HttpCode(204)
  async bulkUpdateCleaningService(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
    @Body() dto: BulkUpdateCleaningServiceDto,
  ): Promise<void> {
    await this.moveOutService.bulkUpdateCleaningService(scheduleUuid, dto);
  }

  @ApiOperation({
    summary: 'Apply for Inspection',
    description:
      'User applies for inspection. The user must be in the inspection target list and apply within the application period. [Moved to POST /application]',
    deprecated: true,
  })
  @ApiCreatedResponse({
    description: 'Inspection application completed successfully.',
    type: ApplicationUuidResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - Application period has not started yet or has already ended',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Inspection target info or slot not found',
    type: ErrorDto,
  })
  @ApiConflictResponse({
    description:
      'Conflict - Application already exists or inspection slot is full',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Post('application')
  async applyInspection(
    @GetUser() user: User,
    @Body() applyInspectionDto: ApplyInspectionDto,
  ): Promise<ApplicationUuidResDto> {
    return await this.moveOutService.applyInspection(user, applyInspectionDto);
  }

  @ApiOperation({
    summary: 'Get My Inspection Type by Slot',
    description:
      'Retrieve the current user’s move-out inspection type for the schedule of the given inspection slot. [Moved to GET /application/inspection-type]',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The inspection type has been successfully retrieved.',
    type: MyInspectionTypeResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User is not an inspection target for this schedule',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Inspection slot not found',
    type: ErrorDto,
  })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('slot/:uuid/inspection-type')
  async findMyInspectionTypeBySlot(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) inspectionSlotUuid: string,
  ): Promise<MyInspectionTypeResDto> {
    return this.moveOutService.findMyInspectionTypeBySlot(
      user,
      inspectionSlotUuid,
    );
  }

  @ApiOperation({
    summary: 'Get My Inspection Application',
    description:
      "Retrieve the current user's inspection application for the active move-out schedule. [Moved to GET /application/me]",
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The inspection application has been successfully retrieved.',
    type: InspectionResDto,
  })
  @ApiNotFoundResponse({
    description: 'Not Found',
    type: ErrorDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('application/me')
  async findMyInspection(@GetUser() user: User): Promise<InspectionResDto> {
    return await this.moveOutService.findMyInspection(user);
  }

  @ApiOperation({
    summary: 'Get Inspection Application',
    description:
      'Retrieve inspection application for the active move-out schedule. [Moved to GET /application/:uuid]',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The inspection application has been successfully retrieved.',
    type: ApplicationResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({
    description: 'Not Found',
    type: ErrorDto,
  })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get('application/:uuid')
  async findApplication(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<ApplicationResDto> {
    return await this.moveOutService.findApplication(uuid);
  }

  @ApiOperation({
    summary: 'Update My Inspection Application',
    description:
      "Update the current user's inspection application to a new inspection slot. [Moved to PATCH /application/:uuid]",
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The inspection application has been successfully updated.',
    type: ApplicationUuidResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - Only owners can modify; modification restricted within 1 hour of start.',
  })
  @ApiNotFoundResponse({
    description: 'Not Found',
    type: ErrorDto,
  })
  @ApiConflictResponse({ description: 'Conflict - New slot is already full' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Patch('application/:uuid')
  async updateApplication(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ): Promise<ApplicationUuidResDto> {
    return this.moveOutService.updateApplication(
      user,
      uuid,
      updateApplicationDto,
    );
  }

  @ApiOperation({
    summary: 'Cancel My Inspection Application',
    description:
      "Cancel the current user's inspection application. If canceled within 1 hour of the inspection time, it will be recorded as a 'no-show' and consume an application attempt. [Moved to DELETE /application/:uuid]",
    deprecated: true,
  })
  @ApiNoContentResponse({
    description: 'The inspection application has been successfully canceled.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Only owners can cancel.',
  })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Delete('application/:uuid')
  @HttpCode(204)
  async cancelInspection(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<void> {
    return this.moveOutService.cancelInspection(user, uuid);
  }

  @ApiOperation({
    summary: 'Submit inspection result',
    description:
      'Inspector submits inspection result for the given application. [Moved to PATCH /application/:uuid/result]',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The inspection result has been successfully submitted.',
    type: RegisterResultResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiConflictResponse({
    description:
      'Conflict - Inspection result has already been marked as passed.',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User is not an inspector or not assigned to this application.',
  })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Patch('application/:uuid/result')
  async submitInspectionResult(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() submitInspectionResultDto: SubmitInspectionResultDto,
  ): Promise<RegisterResultResDto> {
    return this.moveOutService.submitInspectionResult(
      user,
      uuid,
      submitInspectionResultDto,
    );
  }

  @ApiOperation({
    summary: 'Verify inspection document upload',
    description:
      'Verify if the inspection document has been successfully uploaded to S3 and set its status to active. [Moved to PATCH /application/:uuid/document/verify]',
    deprecated: true,
  })
  @ApiOkResponse({
    description: 'The document has been successfully verified.',
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - No document or not uploaded',
  })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Patch('application/:uuid/document/verify')
  async verifyInspectionDocument(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<void> {
    await this.moveOutService.verifyInspectionDocument(uuid);
  }
}
