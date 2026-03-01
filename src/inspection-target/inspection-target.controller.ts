import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Patch,
  Put,
  ParseUUIDPipe,
  HttpCode,
  Param,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { UpdateInspectionTargetsDto } from './dto/req/update-inspection-targets.dto';
import { UpdateInspectionTargetsResDto } from './dto/res/update-inspection-targets-res.dto';
import { InspectionTargetService } from './inspection-target.service';
import { BulkUpdateCleaningServiceDto } from './dto/req/bulk-update-cleaning-service.dto';
import { InspectionTargetsGroupedByRoomResDto } from './dto/res/find-all-inspection-target-infos-res.dto';
import { AssignedTargetsResDto } from './dto/res/assigned-targets-res.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('inspection-target')
export class InspectionTargetController {
  constructor(
    private readonly inspectionTargetService: InspectionTargetService,
  ) {}

  @ApiOperation({
    summary: 'Get My Assigned Inspection Targets (Inspector)',
    description:
      'Get inspection targets assigned to the inspector in the active schedule',
  })
  @ApiOkResponse({
    description: 'The inspection targets have been successfully retrieved.',
    type: AssignedTargetsResDto,
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
  @Get('me')
  async getMyAssignedTargets(
    @GetUser() user: User,
  ): Promise<AssignedTargetsResDto> {
    return await this.inspectionTargetService.getMyAssignedTargets(user);
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
  @Put('schedule/:uuid')
  async updateInspectionTargets(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UpdateInspectionTargetsResDto> {
    return await this.inspectionTargetService.updateInspectionTargetsAndUpdateSlotCapacities(
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
  @Get('schedule/:uuid')
  async findAllInspectionTargetInfos(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
  ): Promise<InspectionTargetsGroupedByRoomResDto[]> {
    return await this.inspectionTargetService.findAllInspectionTargetInfoByScheduleUuid(
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
  @Patch('schedule/:uuid/cleaning-service')
  @HttpCode(204)
  async bulkUpdateCleaningService(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
    @Body() dto: BulkUpdateCleaningServiceDto,
  ): Promise<void> {
    await this.inspectionTargetService.bulkUpdateCleaningService(
      scheduleUuid,
      dto,
    );
  }
}
