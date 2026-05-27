import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SuperAdminGuard } from 'src/auth/guard/superadmin.guard';
import { ErrorDto } from 'src/common/dto/error.dto';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/req/create-admin.dto';
import { TransferSuperAdminDto } from './dto/req/transfer-superadmin.dto';
import { AdminListDto } from './dto/res/admin-list.dto';
import { AdminListItemDto } from './dto/res/admin-list-item.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: 'List admins',
    description: 'List active ADMIN and SUPERADMIN users.',
  })
  @ApiOkResponse({ type: AdminListDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(SuperAdminGuard)
  @Get('admins')
  async listAdmins(): Promise<AdminListDto> {
    const admins = await this.adminService.listAdmins();
    return new AdminListDto(admins.map((u) => new AdminListItemDto(u)));
  }

  @ApiOperation({
    summary: 'Promote user to ADMIN',
    description:
      'SUPERADMIN only. Finds the user by name and student number via student hash.',
  })
  @ApiCreatedResponse({ description: 'Success' })
  @ApiConflictResponse({ description: 'Conflict', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(SuperAdminGuard)
  @Post('admins')
  async createAdmin(@Body() dto: CreateAdminDto): Promise<void> {
    await this.adminService.promoteToAdmin(dto.name, dto.studentNumber);
  }

  @ApiOperation({
    summary: 'Demote ADMIN to USER',
    description: 'SUPERADMIN only. Cannot demote SUPERADMIN.',
  })
  @ApiNoContentResponse({ description: 'No Content' })
  @ApiConflictResponse({ description: 'Conflict', type: ErrorDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(SuperAdminGuard)
  @HttpCode(204)
  @Delete('admins/:userUuid')
  async deleteAdmin(
    @Param('userUuid', ParseUUIDPipe) userUuid: string,
  ): Promise<void> {
    await this.adminService.demoteAdminToUser(userUuid);
  }

  @ApiOperation({
    summary: 'Transfer SUPERADMIN',
    description:
      'SUPERADMIN only. Demotes current SUPERADMIN to ADMIN, promotes target to SUPERADMIN.',
  })
  @ApiCreatedResponse({ description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorDto })
  @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
  @ApiBearerAuth('admin')
  @UseGuards(SuperAdminGuard)
  @Post('superadmin/transfer')
  async transferSuperAdmin(@Body() dto: TransferSuperAdminDto): Promise<void> {
    await this.adminService.transferSuperAdmin(dto.targetUserUuid);
  }
}
