import { Module } from '@nestjs/common';
import { PrismaModule } from '@lib/prisma';
import { MoveOutRepository } from './move-out.repository';

@Module({
  imports: [PrismaModule],
  providers: [MoveOutRepository],
  exports: [MoveOutRepository],
})
export class MoveOutDataAccessModule {}
