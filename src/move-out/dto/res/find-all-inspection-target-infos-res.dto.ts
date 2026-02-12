import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class Resident {
  @ApiProperty({
    description: 'Admission year of the resident',
    example: '2020',
  })
  @IsString()
  admissionYear: string;

  @ApiProperty({
    description: 'Name of the resident',
    example: '홍길동',
  })
  @IsString()
  name: string;
}

/* enum InspectionType {
  Full,
  Solo,
  Duo,
} */

export class InspectionTargetsGroupedByRoom {
  @ApiProperty({
    description: 'Room number',
    example: 'XXX101',
  })
  @IsString()
  roomNumber: string;

  @ApiProperty({
    description: 'List of residents in the room',
    type: [Resident],
  })
  @Type(() => Resident)
  @ValidateNested({ each: true })
  @IsArray()
  residents: Resident[];

  // inspectionType: InspectionType;

  @ApiProperty({
    description: 'Number of inspections',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  inspectionCount: number;

  @ApiProperty({
    description: 'Last inspection time',
    example: '2026-01-22T03:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  lastInspectionTime: Date;

  @ApiPropertyOptional({
    description: 'Whether the inspection is passed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPassed?: boolean;
}

export class FindAllInspectionTargetsResDto {
  @ApiProperty({
    description: 'List of inspection targets grouped by room',
    type: [InspectionTargetsGroupedByRoom],
  })
  @Type(() => InspectionTargetsGroupedByRoom)
  @ValidateNested({ each: true })
  @IsArray()
  inspectionTargetsGroupedByRooms: InspectionTargetsGroupedByRoom[];
}
