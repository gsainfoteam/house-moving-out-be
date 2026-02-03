import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import {
  CreateInspectionTargetsDto,
  CreateInspectionTargetsSwaggerDto,
} from './dto/req/create-inspection-targets.dto';
import { CreateMoveOutScheduleDto } from './dto/req/create-move-out-schedule.dto';
import { InspectionTargetsBySemestersQueryDto } from './dto/req/inspection-targets-by-semesters-query.dto';
import { ApplyInspectionResDto } from './dto/res/apply-inspection-res.dto';
import { CreateInspectionTargetsResDto } from './dto/res/create-inspection-targets-res.dto';
import { DeleteInspectionTargetsResDto } from './dto/res/delete-inspection-targets-res.dto';
import { InspectionTargetInfoResDto } from './dto/res/inspection-target-info-res.dto';
import { MoveOutScheduleResDto } from './dto/res/move-out-schedule-res.dto';
import { MoveOutScheduleWithSlotsResDto } from './dto/res/move-out-schedule-with-slots-res.dto';
import { MoveOutService } from './move-out.service';
import { Semester } from './types/semester.type';

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
    summary: 'Create Move Out Schedule',
    description: 'Create a new move out schedule.',
  })
  @ApiCreatedResponse({
    description: 'The move out schedule has been successfully created.',
    type: MoveOutScheduleResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @ApiBody({ type: CreateMoveOutScheduleDto })
  @UseGuards(AdminGuard)
  @Post('schedule')
  async createMoveOutSchedule(
    @Body() createMoveOutScheduleDto: CreateMoveOutScheduleDto,
  ): Promise<MoveOutScheduleResDto> {
    return await this.moveOutService.createMoveOutSchedule(
      createMoveOutScheduleDto,
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
    summary: 'Compare Two Sheets and Find Inspection Target Rooms',
    description:
      'Upload Excel file with 2 sheets (current semester and next semester application), compare room assignments, and save students that need inspection. Requires current semester and next semester information.',
  })
  @ApiCreatedResponse({
    description: 'Inspection targets successfully created',
    type: CreateInspectionTargetsResDto,
  })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateInspectionTargetsSwaggerDto })
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @Post('inspection-targets')
  async compareSheets(
    @UploadedFile() file: Express.Multer.File,
    @Body() createInspectionTargetsDto: CreateInspectionTargetsDto,
  ): Promise<CreateInspectionTargetsResDto> {
    const currentSemester: Semester = {
      year: createInspectionTargetsDto.currentYear,
      season: createInspectionTargetsDto.currentSeason,
    };
    const nextSemester: Semester = {
      year: createInspectionTargetsDto.nextYear,
      season: createInspectionTargetsDto.nextSeason,
    };

    const savedCount =
      await this.moveOutService.compareTwoSheetsAndFindInspectionTargets(
        file,
        currentSemester,
        nextSemester,
      );

    return {
      message: 'Inspection targets successfully created',
      count: savedCount,
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
    type: ApplyInspectionResDto,
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
  ): Promise<ApplyInspectionResDto> {
    return await this.moveOutService.applyInspection(user, applyInspectionDto);
  }
}
