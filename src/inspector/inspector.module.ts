import { Module } from '@nestjs/common';
import { InspectorController } from './inspector.controller';
import { InspectorService } from './inspector.service';
import { PrismaModule } from '@lib/prisma';
import { MoveOutDataAccessModule } from 'src/move-out/move-out-data-access.module';
import { InspectorDataAccessModule } from './inspector-data-access.module';

@Module({
  imports: [PrismaModule, MoveOutDataAccessModule, InspectorDataAccessModule],
  controllers: [InspectorController],
  providers: [InspectorService],
  exports: [InspectorService],
})
export class InspectorModule {}
