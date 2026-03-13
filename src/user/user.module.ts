import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ScheduleModule } from 'src/schedule/schedule.module';
import { DatabaseModule } from '@lib/database';
import { InspectorModule } from 'src/inspector/inspector.module';

@Module({
  imports: [DatabaseModule, ScheduleModule, InspectorModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
