import { Module } from '@nestjs/common';
import { MoveOutService } from './move-out.service';
import { MoveOutController } from './move-out.controller';

@Module({
  controllers: [MoveOutController],
  providers: [MoveOutService],
})
export class MoveOutModule {}
