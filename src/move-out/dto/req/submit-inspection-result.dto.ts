import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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
    description: 'Content length of the inspection result (pdf file)',
    example: 1024,
  })
  @IsNumber()
  @IsInt()
  @Max(3 * 1024 * 1024)
  contentLength: number;
}
