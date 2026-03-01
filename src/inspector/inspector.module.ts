import { Module } from '@nestjs/common';
import { InspectorController } from './inspector.controller';
import { InspectorService } from './inspector.service';
import { PrismaModule } from '@lib/prisma';
import { InspectorRepository } from './inspector.repository';
import { ScheduleModule } from 'src/schedule/schedule.module';

@Module({
  imports: [PrismaModule, ScheduleModule],
  controllers: [InspectorController],
  providers: [InspectorService, InspectorRepository],
  exports: [InspectorService, InspectorRepository],
})
export class InspectorModule {}
