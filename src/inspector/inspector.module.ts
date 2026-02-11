import { Module } from '@nestjs/common';
import { InspectorController } from './inspector.controller';
import { InspectorService } from './inspector.service';
import { InspectorRepository } from './inspector.repository';
import { PrismaModule } from '@lib/prisma';

@Module({
  imports: [PrismaModule],
  controllers: [InspectorController],
  providers: [InspectorService, InspectorRepository],
  exports: [InspectorService],
})
export class InspectorModule {}
