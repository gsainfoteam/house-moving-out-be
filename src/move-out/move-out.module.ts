import { Module } from '@nestjs/common';
import { MoveOutService } from './move-out.service';
import { MoveOutController } from './move-out.controller';
import { MoveOutRepository } from './move-out.repository';
import { PrismaModule } from '@lib/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [MoveOutController],
  providers: [MoveOutService, MoveOutRepository],
})
export class MoveOutModule {}
