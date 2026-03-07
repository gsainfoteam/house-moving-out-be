import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { FileModule } from '@lib/file';
import { InspectorModule } from 'src/inspector/inspector.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [InspectorModule, FileModule, ScheduleModule, DatabaseModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
