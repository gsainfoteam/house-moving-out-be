import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '@lib/prisma';
import { MoveOutModule } from 'src/move-out/move-out.module';

@Module({
  imports: [PrismaModule, MoveOutModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
