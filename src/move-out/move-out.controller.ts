import {
  Body,
  Controller,
  Post,
  UseGuards,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { MoveOutService } from './move-out.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { CreateMoveOutScheduleDto } from './dto/req/createMoveOutSchedule.dto';
import { UpdateMoveOutScheduleDto } from './dto/req/updateSchedule.dto';
import { MoveOutSchedule } from 'generated/prisma/client';

@Controller('move-out')
export class MoveOutController {
  constructor(private readonly moveOutService: MoveOutService) {}

  @ApiOperation({
    summary: 'Create Move Out Schedule',
    description: 'Create a new move out schedule.',
  })
  @ApiCreatedResponse({
    description: 'The move out schedule has been successfully created.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Post()
  async createMoveOutSchedule(
    @Body() createMoveOutScheduleDto: CreateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    return this.moveOutService.createMoveOutSchedule(createMoveOutScheduleDto);
  }

  @ApiOperation({
    summary: 'Update Move Out Schedule',
    description:
      'Update an existing move out schedule by ID. Only accessible by admins.',
  })
  @ApiOkResponse({
    description: 'The move out schedule has been successfully updated.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(AdminGuard)
  @Patch(':id')
  async updateMoveOutSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMoveOutScheduleDto: UpdateMoveOutScheduleDto,
  ): Promise<MoveOutSchedule> {
    return this.moveOutService.updateMoveOutSchedule(
      id,
      updateMoveOutScheduleDto,
    );
  }
}
