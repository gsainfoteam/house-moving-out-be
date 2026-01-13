import { Module } from '@nestjs/common';
import { ExcelParserService } from './excel-parser.service';
import { ExcelValidatorService } from './excel-validator.service';

@Module({
  providers: [ExcelParserService, ExcelValidatorService],
  exports: [ExcelParserService, ExcelValidatorService],
})
export class ExcelParserModule {}
