import { Module } from '@nestjs/common';
import { PrismaModule } from '@lib/prisma';
import { InspectorRepository } from './inspector.repository';

@Module({
  imports: [PrismaModule],
  providers: [InspectorRepository],
  exports: [InspectorRepository],
})
export class InspectorDataAccessModule {}
