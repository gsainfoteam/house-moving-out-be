import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsObject } from 'class-validator';
import { Gender } from 'generated/prisma/client';

export class UpdateInspectionTargetsDto {
  @ApiProperty({
    description: 'Resident gender map per house+floor key',
    type: 'object',
    additionalProperties: {
      type: 'string',
      enum: [Gender.MALE, Gender.FEMALE],
    },
    example: {
      G1: Gender.MALE,
      G2: Gender.MALE,
      G3: Gender.MALE,
      G4: Gender.FEMALE,
      G5: Gender.FEMALE,
      G6: Gender.FEMALE,
    },
  })
  @Transform(({ value }) => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        const result: Record<string, Gender> = {};
        for (const [key, v] of Object.entries(parsed)) {
          if (v === Gender.MALE || v === Gender.FEMALE) {
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
      const result: Record<string, Gender> = {};
      for (const [key, v] of Object.entries(record)) {
        if (v === Gender.MALE || v === Gender.FEMALE) {
          result[key] = v;
        }
      }
      return result;
    }
    return {};
  })
  @IsObject()
  residentGenderByHouseFloorKey: Record<string, Gender>;
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
