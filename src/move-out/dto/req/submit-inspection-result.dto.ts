import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SubmitInspectionResultDto {
  @ApiPropertyOptional({
    description: 'Passed inspection item slugs',
    example: ['door', 'air-conditioner'],
    type: [String],
  })
  @Transform(({ value }: { value: string[] | string }) => {
    if (Array.isArray(value)) {
      return value;
    }

    return value.split(',').map((v) => v.trim());
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
  @Transform(({ value }: { value: string[] | string }) => {
    if (Array.isArray(value)) {
      return value;
    }

    return value.split(',').map((v) => v.trim());
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  failed: string[] = [];
}

export class SubmitInspectionResultFormDto extends SubmitInspectionResultDto {
  @ApiProperty({
    description: 'Inspector signature image file',
    type: 'string',
    format: 'binary',
  })
  inspectorSignature: Express.Multer.File;

  @ApiProperty({
    description: 'Inspection target signature image file',
    type: 'string',
    format: 'binary',
  })
  targetSignature: Express.Multer.File;
}
