import { Type } from 'class-transformer';
import { IsArray, IsDate } from 'class-validator';

export class UpdateInspectorDto {
  @IsArray()
  @IsDate({ each: true })
  @Type(() => Date)
  inspectionTimes: Date[];
}
