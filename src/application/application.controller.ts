import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Patch,
  ParseUUIDPipe,
  HttpCode,
  Param,
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
import { ApplyInspectionDto } from './dto/req/apply-inspection.dto';
import { InspectionResDto } from './dto/res/inspection-res.dto';
import { ApplicationUuidResDto } from './dto/res/application-uuid-res.dto';
import { UpdateApplicationDto } from './dto/req/update-inspection.dto';
import { ApplicationService } from './application.service';
import { SubmitInspectionResultDto } from './dto/req/submit-inspection-result.dto';
import { RegisterResultResDto } from './dto/res/register-result-res.dto';
import { ApplicationListQueryDto } from './dto/req/application-list-query.dto';
import {
  ApplicationListResDto,
  ApplicationResDto,
} from './dto/res/application-list-res.dto';
import { MyInspectionTypeResDto } from './dto/res/my-inspection-type-res.dto';
import { InspectionTargetService } from '../inspection-target/inspection-target.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('application')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly inspectionTargetService: InspectionTargetService,
  ) {}

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
  @Get('schedule/:uuid')
  async findAllInspectionApplications(
    @Param('uuid', ParseUUIDPipe) scheduleUuid: string,
    @Query() query: ApplicationListQueryDto,
  ): Promise<ApplicationListResDto> {
    return await this.applicationService.findApplicationsByScheduleUuid(
      query,
      scheduleUuid,
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
  @Post()
  async applyInspection(
    @GetUser() user: User,
    @Body() applyInspectionDto: ApplyInspectionDto,
  ): Promise<ApplicationUuidResDto> {
    return await this.applicationService.applyInspection(
      user,
      applyInspectionDto,
    );
  }

  @ApiOperation({
    summary: 'Get My Inspection Type by Slot',
    description:
      'Retrieve the current user’s move-out inspection type for the schedule of the given inspection slot.',
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
  @Get('inspection-type')
  async findMyInspectionTypeBySlot(
    @GetUser() user: User,
  ): Promise<MyInspectionTypeResDto> {
    return await this.inspectionTargetService.findMyInspectionTypeBySlot(user);
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
    type: ErrorDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Get('me')
  async findMyInspection(@GetUser() user: User): Promise<InspectionResDto> {
    return await this.applicationService.findMyInspection(user);
  }

  @ApiOperation({
    summary: 'Get Inspection Application',
    description:
      'Retrieve inspection application for the active move-out schedule.',
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
  @Get(':uuid')
  async findApplication(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<ApplicationResDto> {
    return await this.applicationService.findApplication(uuid);
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
    type: ErrorDto,
  })
  @ApiConflictResponse({ description: 'Conflict - New slot is already full' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Patch(':uuid')
  async updateApplication(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ): Promise<ApplicationUuidResDto> {
    return this.applicationService.updateApplication(
      user,
      uuid,
      updateApplicationDto,
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
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('user')
  @UseGuards(UserGuard)
  @Delete(':uuid')
  @HttpCode(204)
  async cancelInspection(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<void> {
    return this.applicationService.cancelInspection(user, uuid);
  }

  @ApiOperation({
    summary: 'Submit inspection result',
    description:
      'Inspector submits inspection result for the given application.',
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
  @Patch(':uuid/result')
  async submitInspectionResult(
    @GetUser() user: User,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() submitInspectionResultDto: SubmitInspectionResultDto,
  ): Promise<RegisterResultResDto> {
    return this.applicationService.submitInspectionResult(
      user,
      uuid,
      submitInspectionResultDto,
    );
  }

  @ApiOperation({
    summary: 'Verify inspection document upload',
    description:
      'Verify if the inspection document has been successfully uploaded to S3 and set its status to active.',
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
  @Patch(':uuid/document/verify')
  async verifyInspectionDocument(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<void> {
    await this.applicationService.verifyInspectionDocument(uuid);
  }
}
