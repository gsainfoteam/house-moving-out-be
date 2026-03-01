import { Module } from '@nestjs/common';
import { MoveOutService } from './move-out.service';
import { MoveOutController } from './move-out.controller';
import { PrismaModule } from '@lib/prisma';
import { ExcelParserModule } from '@lib/excel-parser';
import { FileModule } from '@lib/file';
import { InspectorModule } from 'src/inspector/inspector.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { InspectionTargetModule } from '../inspection-target/inspection-target.module';
import { ApplicationModule } from '../application/application.module';
import { MoveOutRepository } from './move-out.repository';

@Module({
  imports: [
    PrismaModule,
    ExcelParserModule,
    InspectorModule,
    FileModule,
    ScheduleModule,
    InspectionTargetModule,
    ApplicationModule,
  ],
  controllers: [MoveOutController],
  providers: [MoveOutService, MoveOutRepository],
  exports: [MoveOutService, MoveOutRepository],
})
export class MoveOutModule {}
