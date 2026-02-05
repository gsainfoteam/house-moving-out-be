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
import { User } from 'generated/prisma/browser';
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
import { UpdateInspectionDto } from './dto/req/update-inspection.dto';
import { InspectionTargetsBySemestersQueryDto } from './dto/req/inspection-targets-by-semesters-query.dto';
import { DeleteInspectionTargetsResDto } from './dto/res/delete-inspection-targets-res.dto';
import { InspectionTargetInfoResDto } from './dto/res/inspection-target-info-res.dto';
import { MoveOutScheduleResDto } from './dto/res/move-out-schedule-res.dto';
import { MoveOutService } from './move-out.service';
import { CreateMoveOutScheduleWithTargetsDto } from './dto/req/create-move-out-schedule-with-targets.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('move-out')
export class MoveOutController {
  constructor(private readonly moveOutService: MoveOutService) {}

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
  @Get('schedule')
  async findAllMoveOutSchedules(): Promise<MoveOutScheduleResDto[]> {
    return await this.moveOutService.findAllMoveOutSchedules();
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
      'Retrieve an active move out schedule including its inspection slots.',
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
  @Get('schedule/:uuid')
  async findMoveOutScheduleWithSlots(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<MoveOutScheduleWithSlotsResDto> {
    return await this.moveOutService.findMoveOutScheduleWithSlots(uuid);
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
  @Get('schedule/:uuid/inspector')
  async findInspectorsByScheduleUuid(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<InspectorResDto[]> {
    return await this.moveOutService.findInspectorsByScheduleUuid(uuid);
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
  @Put('schedule/:uuid/inspection-targets')
  async updateInspectionTargets(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UpdateInspectionTargetsResDto> {
    const updatedCount =
      await this.moveOutService.updateInspectionTargetsAndUpdateSlotCapacities(
        file,
        uuid,
      );

    return {
      count: updatedCount,
    };
  }

  @ApiOperation({
    summary: 'Get Inspection Targets by Semester Combination',
    description:
      'Retrieve inspection targets by current/next semester combination.',
  })
  @ApiOkResponse({
    description: 'Inspection targets successfully retrieved',
    type: [InspectionTargetInfoResDto],
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get('inspection-targets')
  async findInspectionTargetsBySemesters(
    @Query() semestersQuery: InspectionTargetsBySemestersQueryDto,
  ): Promise<InspectionTargetInfoResDto[]> {
    return await this.moveOutService.findInspectionTargetsBySemesters(
      semestersQuery,
    );
  }

  @ApiOperation({
    summary: 'Delete Inspection Targets by Semester Combination',
    description:
      'Delete inspection targets by current/next semester combination.',
  })
  @ApiOkResponse({
    description: 'Inspection targets successfully deleted',
    type: DeleteInspectionTargetsResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Delete('inspection-targets')
  async deleteInspectionTargetsBySemesters(
    @Query() semestersQuery: InspectionTargetsBySemestersQueryDto,
  ): Promise<DeleteInspectionTargetsResDto> {
    return await this.moveOutService.deleteInspectionTargetsBySemesters(
      semestersQuery,
    );
  }

  @ApiOperation({
    summary: 'Apply for Inspection',
    description:
      'User applies for inspection. The user must be in the inspection target list and apply within the application period.',
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
    summary: 'Get My Inspection Application',
    description:
      "Retrieve the current user's inspection application for the active move-out schedule.",
  })
  @ApiOkResponse({
    description: 'The inspection application has been successfully retrieved.',
    type: InspectionResDto,
  })
  @ApiNotFoundResponse({
    description: 'Not Found',
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
    summary: 'Update My Inspection Application',
    description:
      "Update the current user's inspection application to a new inspection slot.",
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
  })
  @ApiConflictResponse({ description: 'Conflict - New slot is already full' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Patch('application/:uuid')
  async updateInspection(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateInspectionDto: UpdateInspectionDto,
  ): Promise<ApplicationUuidResDto> {
    return this.moveOutService.updateInspection(
      user,
      uuid,
      updateInspectionDto,
    );
  }

  @ApiOperation({
    summary: 'Cancel My Inspection Application',
    description:
      "Cancel the current user's inspection application. If canceled within 1 hour of the inspection time, it will be recorded as a 'no-show' and consume an application attempt.",
  })
  @ApiNoContentResponse({
    description: 'The inspection application has been successfully canceled.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Only owners can cancel.',
  })
  @ApiNotFoundResponse({ description: 'Not Found' })
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
}
