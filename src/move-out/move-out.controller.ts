import {
  Body,
  Controller,
  Post,
  UseGuards,
  Param,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MoveOutService } from './move-out.service';
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
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { UserGuard } from 'src/auth/guard/user.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { CreateMoveOutScheduleDto } from './dto/req/create-move-out-schedule.dto';
import { MoveOutScheduleResDto } from './dto/res/move-out-schedule-res.dto';
import {
  CreateInspectionTargetsDto,
  CreateInspectionTargetsSwaggerDto,
} from './dto/req/create-inspection-targets.dto';
import { CreateInspectionTargetsResDto } from './dto/res/create-inspection-targets-res.dto';
import { Semester } from './types/semester.type';
import { MoveOutScheduleWithSlotsResDto } from './dto/res/move-out-schedule-with-slots-res.dto';
import { ApplyInspectionDto } from './dto/req/apply-inspection.dto';
import { ApplyInspectionResDto } from './dto/res/apply-inspection-res.dto';
import { User } from 'generated/prisma/browser';

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
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch('schedule/:id')
  @UsePipes(
    new ValidationPipe({
      skipMissingProperties: true,
      transformOptions: {
        exposeUnsetFields: false,
      },
    }),
  )
  async updateMoveOutSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutScheduleResDto> {
    return await this.moveOutService.updateMoveOutSchedule(
      id,
      updateMoveOutScheduleDto,
    );
  } */

  @ApiOperation({
    summary: 'Get Move Out Schedule with Slots',
    description:
      'Retrieve a specific move out schedule including its inspection slots by ID.',
  })
  @ApiOkResponse({
    description:
      'The move out schedule with slots has been successfully retrieved.',
    type: MoveOutScheduleWithSlotsResDto,
  })
  @ApiNotFoundResponse({ description: 'Not Found' })
  @ApiBadRequestResponse({ description: 'Invalid ID format' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Get('schedule/:id')
  async findMoveOutScheduleWithSlots(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MoveOutScheduleWithSlotsResDto> {
    return await this.moveOutService.findMoveOutScheduleWithSlots(id);
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
