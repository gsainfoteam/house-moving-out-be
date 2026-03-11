import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsObject } from 'class-validator';

export class UpdateInspectionTargetsDto {
  @ApiProperty({
    description: 'Resident gender map per house+floor key.',
    example: {
      G1: 'male',
      G2: 'male',
      G3: 'male',
      G4: 'female',
      G5: 'female',
      G6: 'female',
    },
  })
  @Transform(({ value }) => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        const result: Record<string, 'male' | 'female'> = {};
        for (const [key, v] of Object.entries(parsed)) {
          if (v === 'male' || v === 'female') {
            result[key] = v;
          }
        }
        return result;
      } catch {
        return {};
      }
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const result: Record<string, 'male' | 'female'> = {};
      for (const [key, v] of Object.entries(record)) {
        if (v === 'male' || v === 'female') {
          result[key] = v;
        }
      }
      return result;
    }
    return {};
  })
  @IsObject()
  residentGenderByHouseFloorKey: Record<string, 'male' | 'female'>;
}

export class UpdateInspectionTargetsFormDto extends UpdateInspectionTargetsDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Current semester resident Excel file (.xlsx)',
  })
  currentSemesterFile: Express.Multer.File;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Next semester resident Excel file (.xlsx)',
  })
  nextSemesterFile: Express.Multer.File;
}
