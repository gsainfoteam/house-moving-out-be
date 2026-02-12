import { Module } from '@nestjs/common';
import { MoveOutService } from './move-out.service';
import { MoveOutController } from './move-out.controller';
import { MoveOutRepository } from './move-out.repository';
import { PrismaModule } from '@lib/prisma';
import { ExcelParserModule } from '@lib/excel-parser';
import { InspectorModule } from 'src/inspector/inspector.module';

@Module({
  imports: [PrismaModule, ExcelParserModule, InspectorModule],
  controllers: [MoveOutController],
  providers: [MoveOutService, MoveOutRepository],
  exports: [MoveOutService],
})
export class MoveOutModule {}
