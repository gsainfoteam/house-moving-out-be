import { Module, forwardRef } from '@nestjs/common';
import { InspectionTargetService } from './inspection-target.service';
import { InspectionTargetController } from './inspection-target.controller';
import { PrismaModule } from '@lib/prisma';
import { ExcelParserModule } from '@lib/excel-parser';
import { InspectionTargetRepository } from './inspection-target.repository';
import { ScheduleModule } from '../schedule/schedule.module';
import { ApplicationModule } from '../application/application.module';
import { InspectorModule } from 'src/inspector/inspector.module';

@Module({
  imports: [
    PrismaModule,
    ExcelParserModule,
    forwardRef(() => ScheduleModule),
    forwardRef(() => ApplicationModule),
    forwardRef(() => InspectorModule),
  ],
  controllers: [InspectionTargetController],
  providers: [InspectionTargetService, InspectionTargetRepository],
  exports: [InspectionTargetService, InspectionTargetRepository],
})
export class InspectionTargetModule {}
