import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '@lib/prisma';
import { InspectionTargetModule } from 'src/inspection-target/inspection-target.module';

@Module({
  imports: [PrismaModule, InspectionTargetModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
