import {
  Body,
  Controller,
  Post,
  UseGuards,
  Patch,
  Param,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  ValidationPipe,
  UsePipes,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MoveOutService } from './move-out.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import { UpdateMoveOutScheduleDto } from './dto/req/updateMoveOutSchedule.dto';
import { MoveOutScheduleResDto } from './dto/res/moveOutScheduleRes.dto';
import { UploadExcelDto } from './dto/req/uploadExcel.dto';
import { CreateInspectionTargetsQueryDto } from './dto/req/createInspectionTargetsQuery.dto';
import { SemesterDto } from './dto/req/semester.dto';
import { CreateInspectionTargetsResDto } from './dto/res/createInspectionTargetsRes.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('move-out')
export class MoveOutController {
  constructor(private readonly moveOutService: MoveOutService) {}

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
  @UseGuards(AdminGuard)
  @Post()
  async createMoveOutSchedule(
    @Body() createMoveOutScheduleDto: CreateMoveOutScheduleDto,
  ): Promise<MoveOutScheduleResDto> {
    return await this.moveOutService.createMoveOutSchedule(
      createMoveOutScheduleDto,
    );
  }

  @ApiOperation({
    summary: 'Update Move Out Schedule',
    description:
      'Update an existing move out schedule by ID. Only accessible by admins.',
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
  @Patch(':id')
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
  @ApiBody({ type: UploadExcelDto })
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
    @Query() queryDto: CreateInspectionTargetsQueryDto,
  ): Promise<CreateInspectionTargetsResDto> {
    const currentSemesterDto: SemesterDto = {
      year: queryDto.currentYear,
      season: queryDto.currentSeason,
    };
    const nextSemesterDto: SemesterDto = {
      year: queryDto.nextYear,
      season: queryDto.nextSeason,
    };

    const savedCount =
      await this.moveOutService.compareTwoSheetsAndFindInspectionTargets(
        file,
        currentSemesterDto,
        nextSemesterDto,
      );

    return {
      message: 'Inspection targets successfully created',
      count: savedCount,
    };
  }
}
