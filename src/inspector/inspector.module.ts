import { Module } from '@nestjs/common';
import { InspectorController } from './inspector.controller';
import { InspectorService } from './inspector.service';
import { ScheduleModule } from 'src/schedule/schedule.module';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [ScheduleModule, DatabaseModule],
  controllers: [InspectorController],
  providers: [InspectorService],
  exports: [InspectorService],
})
export class InspectorModule {}
