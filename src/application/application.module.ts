import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { PrismaModule } from '@lib/prisma';
import { FileModule } from '@lib/file';
import { InspectorModule } from 'src/inspector/inspector.module';
import { ApplicationRepository } from './application.repository';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [PrismaModule, InspectorModule, FileModule, ScheduleModule],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationRepository],
})
export class ApplicationModule {}
