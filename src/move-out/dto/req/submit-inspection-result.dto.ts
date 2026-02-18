import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SubmitInspectionResultDto {
  @ApiPropertyOptional({
    description: 'Passed inspection item slugs',
    example: ['door', 'air-conditioner'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  passed: string[] = [];

  @ApiPropertyOptional({
    description: 'Failed inspection item slugs',
    example: ['window'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  failed: string[] = [];

  @ApiProperty({
    description: 'Content length of the inspection result',
    example: 1024,
  })
  @IsNumber()
  @IsInt()
  contentLength: number;
}
