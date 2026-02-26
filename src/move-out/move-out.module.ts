import { Module } from '@nestjs/common';
import { MoveOutService } from './move-out.service';
import { MoveOutController } from './move-out.controller';
import { PrismaModule } from '@lib/prisma';
import { ExcelParserModule } from '@lib/excel-parser';
import { FileModule } from '@lib/file';
import { InspectorDataAccessModule } from 'src/inspector/inspector-data-access.module';
import { MoveOutDataAccessModule } from './move-out-data-access.module';

@Module({
  imports: [
    PrismaModule,
    ExcelParserModule,
    InspectorDataAccessModule,
    FileModule,
    MoveOutDataAccessModule,
  ],
  controllers: [MoveOutController],
  providers: [MoveOutService],
  exports: [MoveOutService],
})
export class MoveOutModule {}
