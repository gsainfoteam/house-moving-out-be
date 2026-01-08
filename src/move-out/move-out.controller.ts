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
} from '@nestjs/common';
import { MoveOutService } from './move-out.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
}
