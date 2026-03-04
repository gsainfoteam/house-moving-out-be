import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { DatabaseModule } from 'libs/database';
import { PrismaModule } from '@lib/prisma';
import { ExcelParserModule } from '@lib/excel-parser';
import { FileModule } from '@lib/file';

@Module({
  imports: [DatabaseModule, PrismaModule, ExcelParserModule, FileModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
