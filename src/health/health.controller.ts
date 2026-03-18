import { DatabaseService } from '@lib/database';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { HealthService } from './health.service';
import { DatabaseSizeResDto } from './dto/database-size-res.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly healthService: HealthService,
  ) {}

  @ApiOperation({
    summary: 'Health check for the application',
    description: 'Check the health of the application',
  })
  @Get()
  @HealthCheck()
  async check() {
    return await this.health.check([
      () => this.prisma.pingCheck('database', this.databaseService),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 200),
    ]);
  }

  @ApiOperation({
    summary: 'get database size',
    description: 'get the size of the database',
  })
  @ApiOkResponse({
    description: 'The database size has been successfully retrieved.',
    type: DatabaseSizeResDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @Get('database')
  @UseGuards(AdminGuard)
  async getDatabaseSize() {
    return await this.healthService.getDatabaseSize();
  }
}
