import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsString,
  ValidateNested,
} from 'class-validator';

class InspectorDto {
  @ApiProperty({
    example: 'email@gm.gist.ac.kr',
    description: 'Inspector email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Inspector name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '20250000',
    description: 'Inspector student number',
  })
  @IsString()
  studentNumber: string;

  @ApiProperty({
    example: ['2025-01-01T10:00:00.000Z', '2025-01-02T14:00:00.000Z'],
    description: 'Available inspection times',
    type: [Date],
  })
  @IsArray()
  @IsDate({ each: true })
  @Type(() => Date)
  availableTimes: Date[];
}

export class CreateInspectorsDto {
  @ApiProperty({
    description: 'List of inspectors to be created',
    type: [InspectorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectorDto)
  inspectors: InspectorDto[];
}
