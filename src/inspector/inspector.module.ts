import { Module } from '@nestjs/common';
import { InspectorController } from './inspector.controller';
import { InspectorService } from './inspector.service';
import { PrismaModule } from '@lib/prisma';
import { ScheduleModule } from 'src/schedule/schedule.module';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [PrismaModule, ScheduleModule, DatabaseModule],
  controllers: [InspectorController],
  providers: [InspectorService],
  exports: [InspectorService],
})
export class InspectorModule {}
