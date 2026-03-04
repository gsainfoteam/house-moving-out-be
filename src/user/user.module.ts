import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ScheduleModule } from 'src/schedule/schedule.module';
import { DatabaseModule } from 'libs/database';

@Module({
  imports: [DatabaseModule, ScheduleModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
