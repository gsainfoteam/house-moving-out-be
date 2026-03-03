import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { PrismaModule } from '@lib/prisma';
import { ExcelParserModule } from '@lib/excel-parser';
import { ScheduleRepository } from './schedule.repository';
import { FileModule } from '@lib/file';

@Module({
  imports: [PrismaModule, ExcelParserModule, FileModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleRepository],
  exports: [ScheduleService, ScheduleRepository],
})
export class ScheduleModule {}
