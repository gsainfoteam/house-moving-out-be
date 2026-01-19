import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsString,
  ValidateNested,
} from 'class-validator';

class InspectorDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  studentNumber: string;

  @IsArray()
  @IsDate({ each: true })
  @Type(() => Date)
  availableTimes: Date[];
}

export class CreateInspectorsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectorDto)
  inspectors: InspectorDto[];
}
