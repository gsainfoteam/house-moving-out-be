import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '@lib/prisma';
import { ScheduleModule } from 'src/schedule/schedule.module';

@Module({
  imports: [PrismaModule, ScheduleModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
