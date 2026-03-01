import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { PrismaModule } from '@lib/prisma';
import { FileModule } from '@lib/file';
import { InspectorModule } from 'src/inspector/inspector.module';
import { ApplicationRepository } from './application.repository';
import { ScheduleModule } from '../schedule/schedule.module';
import { InspectionTargetModule } from '../inspection-target/inspection-target.module';

@Module({
  imports: [
    PrismaModule,
    InspectorModule,
    FileModule,
    ScheduleModule,
    InspectionTargetModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationRepository],
  exports: [ApplicationService, ApplicationRepository],
})
export class ApplicationModule {}
